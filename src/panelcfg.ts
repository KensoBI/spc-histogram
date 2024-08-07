import { PanelProps } from '@grafana/data';
import {
  AxisConfig,
  OptionsWithLegend,
  OptionsWithTooltip,
  HideableFieldConfig,
  GraphGradientMode,
} from '@grafana/schema';
import { ControlLineReducerId } from 'data/spcReducers';
import { AggregationType, SpcChartTyp } from 'types';

export interface Options extends OptionsWithLegend, OptionsWithTooltip {
  /**
   * Bucket count (approx)
   */
  bucketCount?: number;
  /**
   * Offset buckets by this amount
   */
  bucketOffset?: number;
  /**
   * Size of each bucket
   */
  bucketSize?: number;
  /**
   * Combines multiple series into a single histogram
   */
  combine?: boolean;
  chartType: SpcChartTyp;
  subgroupSize: number;
  aggregationType: AggregationType;
  controlLines: ControlLine[];
}

export interface ControlLine {
  name: string;
  position: number;
  seriesIndex: number;
  lineWidth: number;
  lineColor: string;
  fillDirection: number;
  fillOpacity: number;
  reducerId: ControlLineReducerId;
}

export interface FieldConfig extends AxisConfig, HideableFieldConfig {
  /**
   * Controls the fill opacity of the bars.
   */
  fillOpacity?: number;
  /**
   * Set the mode of the gradient fill. Fill gradient is based on the line color. To change the color, use the standard color scheme field option.
   * Gradient appearance is influenced by the Fill opacity setting.
   */
  gradientMode?: GraphGradientMode;
  /**
   * Controls line width of the bars.
   */
  lineWidth?: number;
}

export const defaultFieldConfig: Partial<FieldConfig> = {
  fillOpacity: 80,
  gradientMode: GraphGradientMode.None,
  lineWidth: 1,
};

export const defaultOptions: Partial<Options> = {
  bucketCount: 30,
  bucketOffset: 0,
};

export interface ChartPanelProps extends PanelProps<Options> {}
