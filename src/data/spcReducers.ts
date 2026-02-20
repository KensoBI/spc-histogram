import { Field, FieldCalcs } from '@grafana/data';

export enum ControlLineReducerId {
  custom = 'custom',
  nominal = 'nominal',
  lsl = 'lsl',
  usl = 'usl',
  min = 'min',
  max = 'max',
  mean = 'mean',
  range = 'range',
  lcl = 'lcl',
  ucl = 'ucl',
  stdDev = 'stdDev',
  variance = 'variance',
  gaussianPeak = 'gaussianPeak',
}

type SpcReducer = (field: Field, subgroupSize: number) => FieldCalcs;

export interface ControlLineReducer {
  id: ControlLineReducerId;
  name: string;
  description?: string;
  computed: boolean;
  isStandard: boolean;
  color: string;
  reduce?: SpcReducer;
}

export const controlLineReducers: ControlLineReducer[] = [
  {
    id: ControlLineReducerId.custom,
    name: 'Custom',
    description: 'Draws custom control line.',
    computed: false,
    isStandard: false,
    color: 'dark-green',
  },
  {
    id: ControlLineReducerId.nominal,
    name: 'Nominal',
    description: 'Draws nominal control line.',
    computed: false,
    isStandard: false,
    color: 'dark-green',
  },
  {
    id: ControlLineReducerId.lsl,
    name: 'LSL',
    description: 'Draws the LSL (Lower Specification Limit), marking the lower boundary of the specification range.',
    computed: false,
    isStandard: false,
    color: 'dark-red',
  },
  {
    id: ControlLineReducerId.usl,
    name: 'USL',
    description: 'Draws the USL (Upper Specification Limit), marking the upper boundary of the specification range.',
    computed: false,
    isStandard: false,
    color: 'dark-red',
  },
  {
    id: ControlLineReducerId.min,
    name: 'Minimum',
    description: 'Computes and draws the minimum of the sample values.',
    computed: true,
    isStandard: true,
    color: 'blue',
  },
  {
    id: ControlLineReducerId.max,
    name: 'Maximum',
    description: 'Computes and draws the maximum of the sample values.',
    computed: true,
    isStandard: true,
    color: 'blue',
  },
  {
    id: ControlLineReducerId.mean,
    name: 'Mean',
    description: 'Computes and draws the average (arithmetic mean) of all the sample values.',
    computed: true,
    isStandard: true,
    color: 'dark-blue',
  },
  {
    id: ControlLineReducerId.range,
    name: 'Range',
    description: 'Computes and draws the range (arithmetic range) of all the sample values.',
    computed: true,
    isStandard: true,
    color: 'purple',
  },
  {
    id: ControlLineReducerId.lcl,
    name: 'LCL',
    description: 'Draws the LCL (Lower Control Limit), marking the lower boundary of the control chart.',
    computed: true,
    isStandard: false,
    color: 'red',
  },
  {
    id: ControlLineReducerId.ucl,
    name: 'UCL',
    description: 'Draws the UCL (Upper Control Limit), marking the upper boundary of the control chart.',
    computed: true,
    isStandard: false,
    color: 'red',
  },
  {
    id: ControlLineReducerId.gaussianPeak,
    name: 'Gaussian Peak (µ)',
    description: 'Draws a line at the peak of the fitted Gaussian curve (µ).',
    computed: true,
    isStandard: false,
    color: 'yellow',
  },
];
