import React from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue, StandardEditorProps } from '@grafana/data';
import { Options } from 'components/Histogram/panelcfg';

type AggregationOption = {
  id: string;
  name: string;
  subgroupSize: number;
};

const aggregationOptions: AggregationOption[] = [
  {
    id: 'none',
    name: 'No aggregation',
    subgroupSize: 1,
  },
  {
    id: 'mr',
    name: 'Moving-range',
    subgroupSize: 1,
  },
  {
    id: 'mean',
    name: 'Mean',
    subgroupSize: 2,
  },
  {
    id: 'range',
    name: 'Range',
    subgroupSize: 2,
  },
  {
    id: 'standardDeviation',
    name: 'Standard deviation',
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
        .map<SelectableValue<string>>((i) => ({ label: i.name, value: i.id }))}
      onChange={(value) => {
        onChange(value.value);
      }}
    />
  );
};
