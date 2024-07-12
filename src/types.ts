import { PanelProps } from '@grafana/data';
import { Options } from 'components/Histogram/panelcfg';

/**
 * @deprecated This property should only be accessed in the migration from v1 to v2
 */
type ConstantItemOptions = {
  name: string;
  color: string;
  title: string;
  lineWidth: number;
};

export type LimitConfigItem = {
  name: string;
  color: string;
};

export enum SpcChartTyp {
  none = 'none',
  x_XmR = 'X-XmR',
  mR_XmR = 'mR-XmR',
  x_XbarR = 'X-XbarR',
  r_XbarR = 'R-XbarR',
  x_XbarS = 'X-XbarS',
  s_XbarS = 'S-XbarS',
}

export type AggregationType = 'none' | 'mean' | 'range' | 'standardDeviation' | 'movingRange';

export interface ControlChartData {
  centerLine: number;
  upperControlLimit: number;
  lowerControlLimit: number;
  data: number[];
}

/**
 * @deprecated This property should only be accessed in the migration from v1 to v2
 */
export type SpcOptions = {
  sampleSize: number;
  aggregation?: AggregationType;
  nominal?: number;
  lsl?: number;
  usl?: number;
};

/**
 * @deprecated This property should only be accessed in the migration from v1 to v2
 */
export type LimitOptions = {
  up?: LimitConfigItem;
  down?: LimitConfigItem;
};

/**
 * @deprecated This property should only be accessed in the migration from v1 to v2
 */
export type ConstantsOptions = {
  items: ConstantItemOptions[];
};

/**
 * @deprecated This property should only be accessed in the migration from v1 to v2
 */
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

export const defaultConstantColor = '#37872d';

export interface ChartPanelProps extends PanelProps<Options> {}
