import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { DataFrame } from '@grafana/data';

interface GaussianParams {
  amplitude: number;
  mean: number;
  stdDev: number;
}

interface GaussianCurve {
  x: number[];
  y: number[];
  params: GaussianParams;
}

// Number of points used to sample the fitted curve across the histogram range,
// so the drawn bell is smooth and its peak is not clipped to a bin center
const CURVE_SAMPLES = 200;

function gaussianFunction(x: number, params: GaussianParams): number {
  const { amplitude, mean, stdDev } = params;
  return amplitude * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);
}

function gaussianFunction2([amplitude, mean, stdDev]: [number, number, number]): (x: number) => number {
  return (x: number) => amplitude * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);
}

function createGaussianCurve(histogramFrame: DataFrame, seriesIndex: number): GaussianCurve {
  // params are NaN until a fit succeeds so callers can detect the empty curve
  const curve: GaussianCurve = {
    x: [],
    y: [],
    params: {
      amplitude: NaN,
      mean: NaN,
      stdDev: NaN,
    },
  };

  const xMinField = histogramFrame.fields.find((f) => f.name === 'xMin');
  const xMaxField = histogramFrame.fields.find((f) => f.name === 'xMax');

  if (!xMinField || !xMaxField) {
    throw new Error('Missing histogram data fields');
  }

  //2 is a starting point because of xMin (0) and xMax (1)
  const countsField = histogramFrame.fields[2 + seriesIndex];
  if (!countsField) {
    // stale series index, e.g. a query was removed from the panel
    return curve;
  }

  const xMin = xMinField.values as number[];
  const xMax = xMaxField.values as number[];
  const countValues = countsField.values as Array<number | null>;

  // Bin centers and counts, kept aligned by skipping bins with non-finite bounds.
  // A null count means the series has no data in that bin, i.e. a count of zero.
  const x: number[] = [];
  const y: number[] = [];
  let rangeMin = Infinity;
  let rangeMax = -Infinity;

  for (let i = 0; i < histogramFrame.length; i++) {
    if (!Number.isFinite(xMin[i]) || !Number.isFinite(xMax[i])) {
      continue;
    }
    const count = countValues[i];
    x.push((xMin[i] + xMax[i]) / 2);
    y.push(typeof count === 'number' && Number.isFinite(count) ? count : 0);
    rangeMin = Math.min(rangeMin, xMin[i]);
    rangeMax = Math.max(rangeMax, xMax[i]);
  }

  if (x.length < 2) {
    return curve;
  }

  // Initial guesses from the histogram moments: count-weighted mean and standard
  // deviation of the bin centers. The counts are exactly the data being fitted, so
  // this stays correct for wide frames and pre-binned histogram queries alike.
  const totalCount = y.reduce((sum, count) => sum + count, 0);
  const initialAmplitude = Math.max(...y);

  if (totalCount <= 0 || initialAmplitude <= 0) {
    return curve;
  }

  const initialMean = x.reduce((sum, xi, i) => sum + xi * y[i], 0) / totalCount;
  const initialStdDev = Math.sqrt(x.reduce((sum, xi, i) => sum + y[i] * (xi - initialMean) ** 2, 0) / totalCount);

  if (!Number.isFinite(initialStdDev) || initialStdDev <= 0) {
    // all counts fall into a single bin — a gaussian cannot be fitted
    return curve;
  }

  const initialValues = [initialAmplitude, initialMean, initialStdDev];
  const options = {
    damping: 1.5,
    initialValues: initialValues,
    // Jacobian step per parameter, scaled to each parameter's magnitude so the
    // fit works regardless of the measurement scale of the data
    gradientDifference: initialValues.map((v) => Math.max(Math.abs(v) * 1e-3, 1e-9)),
    // keep amplitude and stdDev positive
    minValues: [Number.MIN_VALUE, Number.MIN_SAFE_INTEGER, Number.MIN_VALUE],
    maxValues: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    maxIterations: 100,
    errorTolerance: 1e-7,
  };

  // Perform the fit
  const lm = levenbergMarquardt({ x, y }, gaussianFunction2, options);
  const [amplitude, mean, stdDev] = lm.parameterValues;

  // Fall back to the moment estimates if the fit diverged
  const fitIsValid = Number.isFinite(amplitude) && Number.isFinite(mean) && Number.isFinite(stdDev) && stdDev > 0;
  const fittedParams: GaussianParams = fitIsValid
    ? { amplitude, mean, stdDev }
    : { amplitude: initialAmplitude, mean: initialMean, stdDev: initialStdDev };

  // Concentrate the samples on the bell itself: beyond ~5σ the curve is
  // indistinguishable from zero, and joined multi-series histograms can span a
  // range far wider than one series' distribution
  let sampleMin = Math.max(rangeMin, fittedParams.mean - 5 * fittedParams.stdDev);
  let sampleMax = Math.min(rangeMax, fittedParams.mean + 5 * fittedParams.stdDev);

  if (!(sampleMin < sampleMax)) {
    sampleMin = rangeMin;
    sampleMax = rangeMax;
  }

  const step = (sampleMax - sampleMin) / (CURVE_SAMPLES - 1);
  const curveX: number[] = [];
  const curveY: number[] = [];

  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const xi = sampleMin + i * step;
    curveX.push(xi);
    curveY.push(gaussianFunction(xi, fittedParams));
  }

  return { x: curveX, y: curveY, params: fittedParams };
}

export { createGaussianCurve, gaussianFunction, GaussianParams };
