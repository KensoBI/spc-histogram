import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { DataFrame } from '@grafana/data';
import { calculateSampleStandardDeviation } from 'calcs/common';

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

function gaussianFunction(x: number, params: GaussianParams): number {
  const { amplitude, mean, stdDev } = params;
  return amplitude * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);
}

function gaussianFunction2([amplitude, mean, stdDev]: [number, number, number]): (x: number) => number {
  return (x: number) => amplitude * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);
}

//todo we need to separate by series and calculate curver for each series
function createGaussianCurve(histogramFrame: DataFrame, rawSeries: DataFrame[], seriesIndex: number): GaussianCurve {
  const curve: GaussianCurve = {
    x: [],
    y: [],
    params: {
      amplitude: 0,
      mean: 0,
      stdDev: 0,
    },
  };

  // Extract histogram data
  const xMin = histogramFrame.fields.find((f) => f.name === 'xMin')?.values as number[];
  const xMax = histogramFrame.fields.find((f) => f.name === 'xMax')?.values as number[];
  //2 is a starting point becasue of xMina (0) and yMin (1)
  const histogramSeries = 2 + seriesIndex;

  if (!xMin || !xMax || histogramFrame.fields.length < histogramSeries) {
    throw new Error('Missing histogram data fields');
  }

  if (!rawSeries[seriesIndex]) {
    return curve;
  }

  const counts = histogramFrame.fields[histogramSeries].values as number[];

  // Calculate bin centers
  const x = xMin.map((min, i) => (min + xMax[i]) / 2);

  const frame = rawSeries[seriesIndex];

  // Combine all numeric values from rawSeries. Histogram is build from all numeric fields so we need to do the same when calculating the curve values
  const allValues = frame.fields.filter((field) => field.type === 'number').flatMap((field) => field.values);

  // rawSeries.forEach((frame, frameIndex) => {
  //   if (frameIndex === seriesIndex) {
  //     frame.fields.forEach((field) => {
  //       if (field.type === 'number') {
  //         allValues.push(...field.values);
  //       }
  //     });
  //   }
  // });

  // Calculate initial guess for parameters
  const initialAmplitude = Math.max(...counts);
  const initialMean = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
  const initialStdDev = calculateSampleStandardDeviation(allValues);

  // Define the data and parameters for Levenberg-Marquardt
  const data = {
    x: x,
    y: counts,
  };

  const initialValues = [initialAmplitude, initialMean, initialStdDev];
  const options = {
    damping: 1.5,
    initialValues: initialValues,
    gradientDifference: 10e-2,
    maxIterations: 100,
    errorTolerance: 10e-3,
  };

  // Perform the fit
  const lm = levenbergMarquardt(data, gaussianFunction2, options);
  // Perform the fit
  //   const lm = levenbergMarquardt(
  //     data,
  //     (x: number, [amplitude, mean, stdDev]: number[]) => gaussianFunction(x, { amplitude, mean, stdDev }),
  //     options
  //   );

  // Generate the fitted curve
  const fittedParams: GaussianParams = {
    amplitude: lm.parameterValues[0],
    mean: lm.parameterValues[1],
    stdDev: lm.parameterValues[2],
  };

  const fittedY = x.map((xi) => gaussianFunction(xi, fittedParams));

  return { x, y: fittedY, params: fittedParams };
}

export { createGaussianCurve, GaussianParams };
