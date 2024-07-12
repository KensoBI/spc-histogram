import { DataFrame, FieldCalcs, FieldType } from '@grafana/data';
import { calcTimeSampleSize, calcValueSampleSize, calculateNumericRange } from './spcCalculations';
import { Options } from 'components/Histogram/panelcfg';
import { calculateControlCharts, calculateStandardStats } from 'calcs/standard';
import { controlLineReducers } from './spcReducers';

//apply data aggregations to all series
export function sampleParser(series: DataFrame[], options: Options): DataFrame[] {
  const subgroupSize = options.subgroupSize < 1 ? 1 : options.subgroupSize;
  const aggregationType = options.aggregationType ?? 'none';
  const standardReducers = controlLineReducers.filter((p) => p.isStandard).map((p) => p.id);

  //todo check if structure changed if not, get calcs from useState

  return series.map((frame, frameIndex) => {
    const shouldCalculateStandardStats =
      options.controlLines.filter((c) => c.seriesIndex === frameIndex && standardReducers.includes(c.reducerId))
        .length > 0;

    return {
      ...frame,
      fields: frame.fields.map((field) => {
        const updatedField = { ...field };

        //todo check if we need time, maybe just numbers from 1 to field.length and save as not a time field type but a number?
        if (updatedField.type === FieldType.time) {
          updatedField.values = calcTimeSampleSize(updatedField.values, subgroupSize);
        } else if (field.type === FieldType.number) {
          updatedField.state = updatedField.state || {};

          const fieldCalcs: FieldCalcs = {
            lcl: null,
            ucl: null,
            mean: null,
          };

          // replace old calculations with a new set since values may have changed due to aggregations,
          // rendering cached calculations incorrect.
          updatedField.state.calcs = fieldCalcs;

          //calculate control charts
          const controlChartData = calculateControlCharts(updatedField, options.chartType, subgroupSize);
          if (controlChartData) {
            updatedField.values = controlChartData.data;
            fieldCalcs.lcl = controlChartData.lowerControlLimit;
            fieldCalcs.ucl = controlChartData.upperControlLimit;
            fieldCalcs.mean = controlChartData.centerLine;
          } else {
            //calculate other values based on aggregation type
            updatedField.values = calcValueSampleSize(updatedField.values, subgroupSize, aggregationType);
          }

          updatedField.state.range = calculateNumericRange(updatedField.values);

          if (shouldCalculateStandardStats) {
            const standardStats = calculateStandardStats(updatedField);

            updatedField.state.calcs = {
              ...standardStats,
            };
          }

          updatedField.state.calcs = {
            ...updatedField.state.calcs,
            ...fieldCalcs,
          };
        }

        return updatedField;
      }),
    };
  });
}
