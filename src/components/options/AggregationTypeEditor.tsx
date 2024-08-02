import React from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue, StandardEditorProps } from '@grafana/data';
import { Options } from 'panelcfg';
import { AggregationType } from 'types';

type AggregationOption = {
  name: AggregationType;
  subgroupSize: number;
};

const aggregationOptions: AggregationOption[] = [
  {
    name: AggregationType.none,
    subgroupSize: 1,
  },
  {
    name: AggregationType.MovingRange,
    subgroupSize: 1,
  },
  {
    name: AggregationType.Mean,
    subgroupSize: 2,
  },
  {
    name: AggregationType.Range,
    subgroupSize: 2,
  },
  {
    name: AggregationType.StandardDeviation,
    subgroupSize: 2,
  },
];

export const AggregationTypeEditor = ({ value, onChange, context }: StandardEditorProps<string, Options>) => {
  return (
    <Select
      isClearable={false}
      value={value}
      options={aggregationOptions
        .filter((aggregation) => {
          if (context.options.subgroupSize === 1) {
            return aggregation.subgroupSize === 1;
          }
          return context.options.subgroupSize >= aggregation.subgroupSize && aggregation.subgroupSize !== 1;
        })
        .map<SelectableValue<string>>((i) => ({ label: i.name, value: i.name }))}
      onChange={(value) => {
        onChange(value.value);
      }}
    />
  );
};
