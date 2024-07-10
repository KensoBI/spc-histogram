import React from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue, StandardEditorProps } from '@grafana/data';
import { Options } from 'components/Histogram/panelcfg';
import { aggregationOptions } from 'types';

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
