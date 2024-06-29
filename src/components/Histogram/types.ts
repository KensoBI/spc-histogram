import { ConstantsOptions, LimitOptions, SpcOptions, TimeSeriesOptions, defaultTimeseriesColor } from 'types';

export type TimeseriesSettings = TimeSeriesOptions & {
  controlName: string;
  limitConfig?: LimitOptions;
  constantsConfig?: ConstantsOptions;
  spcOptions?: SpcOptions;
};

//todo duplicate defaultTimeseriesOptions
export const defaultTimeseriesSettings: TimeseriesSettings = {
  controlName: '',
  fill: 8,
  lineWidth: 2,
  pointSize: 6,
  lineColor: defaultTimeseriesColor,
  showLegend: false,
  decimals: 2,
};
