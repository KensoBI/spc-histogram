import { levenbergMarquardt } from 'ml-levenberg-marquardt';
import { DataFrame } from '@grafana/data';
import { calculateSampleStandardDeviation } from 'calcs/common';

interface GaussianParams {
  amplitude: number;
  mean: number;
  stdDev: number;
}

function gaussianFunction(x: number, params: GaussianParams): number {
  const { amplitude, mean, stdDev } = params;
  return amplitude * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);
}

function gaussianFunction2([amplitude, mean, stdDev]: [number, number, number]): (x: number) => number {
  return (x: number) => amplitude * Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);
}

function createGaussianCurve(
  histogramFrame: DataFrame,
  rawSeries: DataFrame[]
): { x: number[]; y: number[]; params: GaussianParams } {
  // Extract histogram data
  const xMin = histogramFrame.fields.find((f) => f.name === 'xMin')?.values as number[];
  const xMax = histogramFrame.fields.find((f) => f.name === 'xMax')?.values as number[];

  if (!xMin || !xMax || histogramFrame.fields.length !== 3) {
    throw new Error('Missing histogram data fields');
  }
  const counts = histogramFrame.fields[2].values as number[];

  // Calculate bin centers
  const x = xMin.map((min, i) => (min + xMax[i]) / 2);

  // Combine all numeric values from rawSeries
  const allValues: number[] = [];
  rawSeries.forEach((frame) => {
    frame.fields.forEach((field) => {
      if (field.type === 'number') {
        allValues.push(...field.values);
      }
    });
  });

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
