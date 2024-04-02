import { AggregationType } from 'types';
import { getCalcConst } from './calcConst';

function notNanArray(values: number[]) {
  return values.map((value) => (typeof value === 'number' && !isNaN(value) ? value : 0));
}

function allocateGroupedArray(base: number[], sampleSize: number) {
  const finalLength = Math.ceil(base.length / sampleSize);
  const result: number[] = new Array(finalLength);
  return {
    result,
    finalLength,
  };
}

function calcAvarageInRange(base: number[], start: number, end: number) {
  let sum = 0.0;
  let count = 0;
  for (let i = start; i <= end; i++) {
    const value = base[i];
    sum += value;
    count++;
  }
  const average = sum / count;
  return average;
}

function calcMeanSquareDifferenceInRange(base: number[], start: number, end: number) {
  const mean = calcAvarageInRange(base, start, end);
  const count = end - start + 1;

  let result = 0.0;
  for (let i = start; i <= end; i++) {
    result += Math.pow(base[i] - mean, 2);
  }
  return result / count;
}

function calculateGrouped(values: number[], sampleSize: number, processor: (base: number[], i: number) => number) {
  //groups values starting from the end of the array (using processor)
  const base = notNanArray(values);
  const { result, finalLength } = allocateGroupedArray(base, sampleSize);

  let pos = finalLength - 1; //where to put the next value, it's the index of the result array
  for (let i = base.length - 1; i >= 0; i -= sampleSize) {
    const value = processor(base, i);
    result[pos--] = value;
  }

  return result;
}

export function calculateGroupedAverage(values: number[], sampleSize: number) {
  return calculateGrouped(values, sampleSize, (base, i) =>
    calcAvarageInRange(base, Math.max(i - sampleSize + 1, 0), i)
  );
}
export function calculateGroupedDifference(values: number[], sampleSize: number) {
  return calculateGrouped(values, sampleSize, (base, i) => {
    let max = base[i];
    let min = base[i];
    for (let j = 1; j < sampleSize && i - j >= 0; j++) {
      const value = base[i - j];
      if (value > max) {
        max = value;
      }
      if (value < min) {
        min = value;
      }
    }

    const difference = max - min;
    return difference;
  });
}

export function calculateGroupedStdDev(values: number[], sampleSize: number) {
  return calculateGrouped(values, sampleSize, (base, i) => {
    const start = Math.max(i - sampleSize + 1, 0);
    const end = i;

    // Calculate the average of the squares of the differences
    const meanSquaredDifferences = calcMeanSquareDifferenceInRange(base, start, end);

    // Calculate the square root of the mean of the squares of the differences (standard deviation)
    const standardDeviation = Math.sqrt(meanSquaredDifferences);
    return standardDeviation;
  });
}

const groupingFunctions = {
  range: calculateGroupedDifference,
  standardDeviation: calculateGroupedStdDev,
  mean: calculateGroupedAverage,
};

export function calcValueSampleSize(values: number[], sampleSize: number, aggType: AggregationType) {
  return sampleSize === 1 ? values : groupingFunctions[aggType](values, sampleSize);
}

export function calcTimeSampleSize(time: number[], sampleSize: number) {
  return sampleSize === 1 ? time : calculateGroupedAverage(time, sampleSize);
}

export function calcMax(values: number[]) {
  return Math.max(...values);
}

export function calcMin(values: number[]) {
  return Math.min(...values);
}

export function calcMean(values: number[]) {
  return calcAvarageInRange(values, 0, values.length - 1);
}

export function calcRange(values: number[]) {
  return calcMax(values) - calcMin(values);
}

export function calcUcl(values: number[], aggType: AggregationType, sample: number) {
  if (sample <= 1) {
    return;
  }

  switch (aggType) {
    case 'range':
      const D4 = getCalcConst(sample, 'd4_range_ucl');
      const Ucl_range = D4 * calcRange(values);
      return [Ucl_range];
    case 'standardDeviation':
      const B4 = getCalcConst(sample, 'b4_sigma_ucl');
      const Ucl_stdDev = B4 * stdDev(values);
      return [Ucl_stdDev];
    default:
    case 'mean':
      const A2 = getCalcConst(sample, 'a2_xbar_limit_range');
      const A3 = getCalcConst(sample, 'a3_xbar_limit_sigma');

      const mean = calcMean(values);

      const Ucl_Rbar = mean + A2 * calcRange(values);
      const Ucl_Sbar = mean + A3 * stdDev(values);

      return [Ucl_Rbar, Ucl_Sbar];
  }
}

export function calcLcl(values: number[], aggType: AggregationType, sample: number) {
  if (sample <= 1) {
    return;
  }

  switch (aggType) {
    case 'range':
      const D3 = getCalcConst(sample, 'd3_range_lcl');
      const Lcl_range = D3 * calcRange(values);
      return [Lcl_range];
    case 'standardDeviation':
      const B3 = getCalcConst(sample, 'b3_sigma_lcl');
      const Lcl_stdDev = B3 * stdDev(values);
      return [Lcl_stdDev];
    default:
    case 'mean':
      const A2 = getCalcConst(sample, 'a2_xbar_limit_range');
      const A3 = getCalcConst(sample, 'a3_xbar_limit_sigma');

      const mean = calcMean(values);

      const Lcl_Rbar = mean - A2 * calcRange(values);
      const Lcl_Sbar = mean - A3 * stdDev(values);

      return [Lcl_Rbar, Lcl_Sbar];
  }
}

export function stdDev(values: number[]) {
  const meanSquaredDifferences = calcMeanSquareDifferenceInRange(values, 0, values.length - 1);
  const standardDeviation = Math.sqrt(meanSquaredDifferences);
  return standardDeviation;
}
