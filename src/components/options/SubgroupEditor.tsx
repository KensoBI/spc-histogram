import React from 'react';
import { Select } from '@grafana/ui';
import { StandardEditorProps } from '@grafana/data';
import { Options } from 'panelcfg';
import { SpcChartTyp } from 'types';

function createSubgroupOptions(startIndex: number, endIndex: number): Array<{ label: string; value: number }> {
  return Array.from({ length: endIndex - startIndex + 1 }, (_, i) => ({
    label: `${i + startIndex}`,
    value: i + startIndex,
  }));
}

export const SubgroupEditor = ({ item, value, onChange, context }: StandardEditorProps<number, Options>) => {
  const chartType = context.options.chartType ? context.options.chartType : SpcChartTyp.none;
  const allowCustomValue = chartType === SpcChartTyp.none;
  let startFrom = 2;
  let isDisabled = false;

  if (chartType === SpcChartTyp.none) {
    startFrom = 1;
  } else if (chartType === SpcChartTyp.mR_XmR || chartType === SpcChartTyp.x_XmR) {
    startFrom = 1;
    isDisabled = true;
    if (value !== 1) {
      onChange(1);
    }
  } else {
    if (value === 1) {
      onChange(2);
    }
  }

  const subgroupOptions = createSubgroupOptions(startFrom, 25);

  return (
    <Select
      isClearable={false}
      disabled={isDisabled}
      allowCustomValue={allowCustomValue}
      value={value}
      options={subgroupOptions}
      onChange={(value) => {
        onChange(value.value);
      }}
    />
  );
};
