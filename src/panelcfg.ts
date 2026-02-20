import { PanelProps } from '@grafana/data';
import {
  AxisConfig,
  OptionsWithLegend,
  OptionsWithTooltip,
  HideableFieldConfig,
  GraphGradientMode,
} from '@grafana/schema';
import { ControlLineReducerId } from 'data/spcReducers';
import { AggregationType, CurveFit, PositionInput, SpcChartTyp } from 'types';

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
  curves: CurveOptions[];
  featureQueryRefIds: string[];
  showStatisticsTable?: boolean;
  statisticsTableColumns?: string[];
}

export interface CurveOptions {
  name: string;
  fit: CurveFit;
  seriesIndex: number;
  lineWidth: number;
  color: string;
}

export interface ControlLine {
  name: string;
  position?: number;
  field: string;
  positionInput: PositionInput;
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
  showStatisticsTable: false,
  statisticsTableColumns: ['n', 'mean', 'stdDev', 'min', 'max', 'lcl', 'ucl', 'cp', 'cpk', 'pp', 'ppk'],
};

export interface ChartPanelProps extends PanelProps<Options> {}

export interface SelectableCurve {
  id: CurveFit;
  name: string;
  description: string;
  color: string;
}

export const selectableCurves: SelectableCurve[] = [
  {
    id: CurveFit.histogram,
    name: CurveFit.histogram,
    description: 'Creates a line that connects the midpoints of the histogram bins.',
    color: 'dark-green',
  },
  {
    id: CurveFit.gaussian,
    name: CurveFit.gaussian,
    description: 'Draws a curve representing the Gaussian (normal) distribution of series values.',
    color: 'dark-green',
  },
];
