import React from 'react';
import { TimeSeriesParams, PanelOptions, defaultTimeseriesSettingsColor } from 'types';
import { GrafanaTheme2, StandardEditorProps } from '@grafana/data';
import { css } from '@emotion/css';
import { InlineField, InlineSwitch, Select, useStyles2 } from '@grafana/ui';
import { InlineColorField } from 'components/InlineColorField';
import { selectableZeroToTen } from './selectableValues';

type Props = StandardEditorProps<TimeSeriesParams, any, PanelOptions>;

export function SimpleParamsEditor({ value, onChange }: Props) {
  const styles = useStyles2(getStyles);
  return (
    <>
      <div className={styles.container}>
        <div className={styles.row}>
          <InlineField label={'Fill'} className={styles.noMargin}>
            <Select
              width={8}
              options={selectableZeroToTen}
              value={value.fill}
              onChange={(selected) => {
                if (selected?.value != null) {
                  onChange({ ...value, fill: selected.value });
                }
              }}
            />
          </InlineField>
          <InlineField label={'Line Width'} className={styles.noMargin}>
            <Select
              width={8}
              options={selectableZeroToTen}
              value={value.lineWidth}
              onChange={(selected) => {
                if (selected?.value != null) {
                  onChange({ ...value, lineWidth: selected.value });
                }
              }}
            />
          </InlineField>
          <InlineSwitch
            label="View legend"
            showLabel={true}
            value={value.showLegend}
            onChange={(e) => onChange({ ...value, showLegend: e.currentTarget.checked })}
          />
          <div>
            <InlineColorField
              label="Color"
              color={value.lineColor ?? defaultTimeseriesSettingsColor}
              onChange={(color) => {
                onChange({ ...value, lineColor: color });
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  const row = css`
    display: flex;
    gap: ${theme.spacing(1)};
    flex-wrap: wrap;
  `;
  return {
    container: css`
      background-color: ${theme.colors.background.canvas};
      padding: ${theme.spacing(1)};
      border-radius: ${theme.shape.borderRadius(2)};
      margin-top: ${theme.spacing(1)};
    `,
    row,
    rowNotFirst: css`
      ${row};
      margin-top: ${theme.spacing(1)};
    `,
    noMargin: css`
      margin: 0;
    `,
  };
};
