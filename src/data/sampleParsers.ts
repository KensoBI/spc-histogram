import { DataFrame, FieldType } from '@grafana/data';
import { SpcOptions } from 'types';
import { calcTimeSampleSize, calcValueSampleSize, calculateNumericRange } from './spcCalculations';

//apply data aggregations to all series
export function sampleParser(series: DataFrame[], spcOptions?: SpcOptions): DataFrame[] {
  //if sample size is not set or is 1 there is nothing for us to calculate here
  if (!spcOptions || spcOptions.sampleSize === 1) {
    return series;
  }

  const sampleSize = spcOptions.sampleSize;
  const aggregation = spcOptions?.aggregation ?? 'mean';

  return series.map((frame) => ({
    ...frame,
    fields: frame.fields.map((field) => {
      const updatedField = { ...field };

      if (field.type === FieldType.time) {
        updatedField.values = calcTimeSampleSize(field.values, sampleSize);
      } else if (field.type === FieldType.number) {
        updatedField.values = calcValueSampleSize(field.values, sampleSize, aggregation);

        if (field.state) {
          updatedField.state = {
            ...field.state,
            range: calculateNumericRange(updatedField.values),
          };
        }
      }

      return updatedField;
    }),
  }));
}
