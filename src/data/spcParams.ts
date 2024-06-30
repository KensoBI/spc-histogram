import { AggregationType } from 'types';

export type SpcControl = {
  name: string;
  label: string;
  description: string;
  type: string;
};

export const allSpcControls: SpcControl[] = [
  {
    name: 'nominal',
    label: 'Nominal',
    description: 'Draws nominal control line.',
    type: 'standard',
  },
  {
    name: 'lsl',
    label: 'LSL',
    description: 'Draws the LCL (Lower Control Limit), marking the lower boundary of the control chart.',
    type: 'standard',
  },
  {
    name: 'usl',
    label: 'USL',
    description: 'Draws the USL (Upper Control Limit), marking the upper boundary of the control chart.',
    type: 'standard',
  },
  {
    name: 'min',
    label: 'Min',
    description: 'Computes and draws the minimum of the sample values.',
    type: 'standard',
  },
  {
    name: 'max',
    label: 'Max',
    description: 'Computes and draws the maximum of the sample values.',
    type: 'standard',
  },
  {
    name: 'mean',
    label: 'Mean',
    description: 'Computes and draws the average (arithmetic mean) of all the sample values.',
    type: 'standard',
  },
  {
    name: 'range',
    label: 'Range',
    description: 'Computes and draws the range (arithmetic range) of all the sample values.',
    type: 'standard',
  },
  {
    name: 'lcl',
    label: 'LCL',
    description: 'Draws the LCL (Lower Control Limit), marking the lower boundary of the control chart.',
    type: 'xbar',
  },
  {
    name: 'ucl',
    label: 'UCL',
    description: 'Draws the USL (Upper Control Limit), marking the upper boundary of the control chart.',
    type: 'xbar',
  },
  {
    name: 'lcl_rbar',
    label: 'LCL R-bar',
    description: 'Draws the LCL (Lower Control Limit), marking the lower boundary of the R-bar chart.',
    type: 'rbar',
  },
  {
    name: 'ucl_rbar',
    label: 'UCL R-bar',
    description: 'Draws the USL (Upper Control Limit), marking the upper boundary of the R-bar chart.',
    type: 'rbar',
  },
  {
    name: 'lcl_sbar',
    label: 'LCL S-bar',
    description: 'Draws the LCL (Lower Control Limit), marking the lower boundary of the S-bar chart.',
    type: 'sbar',
  },
  {
    name: 'ucl_sbar',
    label: 'UCL S-bar',
    description: 'Draws the USL (Upper Control Limit), marking the upper boundary of the S-bar chart.',
    type: 'sbar',
  },
];

export const allSpcParamsDict = {
  nominal: 'Nominal',
  lsl: 'LSL',
  usl: 'USL',
  min: 'Min',
  max: 'Max',
  mean: 'Mean',
  range: 'Range',
  lcl_Rbar: 'LCL R-bar',
  ucl_Rbar: 'UCL R-bar',
  lcl_Sbar: 'LCL S-bar',
  ucl_Sbar: 'UCL S-bar',
  lcl: 'LCL',
  ucl: 'UCL',
};
export type SpcParam = keyof typeof allSpcParamsDict;

function mergeArraysUniqueValues(arr1: string[], arr2: string[]): string[] {
  const uniqueSet = new Set([...arr1, ...arr2]);
  const resultArray: string[] = Array.from(uniqueSet);

  return resultArray;
}

export function availableSpcParams(sampleSize: number, aggregationType: AggregationType): SpcParam[] {
  const params: SpcParam[] = ['nominal', 'lsl', 'usl', 'min', 'max', 'mean', 'range'];
  if (sampleSize > 1 && sampleSize <= 10) {
    if (aggregationType === 'mean') {
      params.push('lcl_Rbar', 'ucl_Rbar', 'lcl_Sbar', 'ucl_Sbar');
    } else {
      params.push('lcl', 'ucl');
    }
  }
  return params;
}
export function availableSpcParamsWithData(
  sampleSize: number,
  aggregationType: AggregationType,
  characteristicKeys: any
): string[] {
  const params: SpcParam[] = ['nominal', 'lsl', 'usl', 'min', 'max', 'mean', 'range'];
  if (sampleSize > 1 && sampleSize <= 10) {
    if (aggregationType === 'mean') {
      params.push('lcl_Rbar', 'ucl_Rbar', 'lcl_Sbar', 'ucl_Sbar');
    } else {
      params.push('lcl', 'ucl');
    }
  }
  const mergedArray = mergeArraysUniqueValues(params, characteristicKeys);
  return mergedArray;
}

const keySet = new Set(Object.keys(allSpcParamsDict));
export function isSpcParam(key: string): key is SpcParam {
  return keySet.has(key);
}
export function filterSpcParams(params: string[]): SpcParam[] {
  return params.filter((param) => isSpcParam(param)) as SpcParam[];
}
