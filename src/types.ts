import { PanelProps } from '@grafana/data';
import { Options } from 'components/Histogram/panelcfg';

export type ConstantItemOptions = {
  name: string;
  color: string;
  title: string;
  lineWidth: number;
};

export type LimitConfigItem = {
  name: string;
  color: string;
};

export type AggregationType = 'mean' | 'range' | 'standardDeviation';

export type SpcOptions = {
  sampleSize: number;
  aggregation?: AggregationType;
  nominal?: number;
  lsl?: number;
  usl?: number;
};

export type LimitOptions = {
  up?: LimitConfigItem;
  down?: LimitConfigItem;
};
export type ConstantsOptions = {
  items: ConstantItemOptions[];
};

export type TimeSeriesOptions = {
  fill?: number;
  lineWidth?: number;
  pointSize?: number;
  lineColor?: string;
  showLegend?: boolean;
  decimals?: number;
};

export const defaultConstantItem: ConstantItemOptions = {
  name: '',
  color: 'rgb(31, 96, 196)',
  title: '',
  lineWidth: 2,
};

//todo remove
export const defaultTimeseriesColor = 'rgb(31, 96, 196)';

export const defaultTimeseriesOptions: TimeSeriesOptions = {
  fill: 8,
  lineWidth: 2,
  pointSize: 6,
  lineColor: 'rgb(31, 96, 196)',
  showLegend: true,
  decimals: 2,
};

export const defaultSpcOptions: SpcOptions = {
  sampleSize: 1,
  aggregation: 'mean',
  nominal: undefined,
  lsl: undefined,
  usl: undefined,
};

export const defaultConstantColor = '#37872d';

export interface ChartPanelProps extends PanelProps<Options> {}
