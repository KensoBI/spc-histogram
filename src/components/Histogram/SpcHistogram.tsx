import { DataFrame, GrafanaTheme2, toDataFrame, FieldConfig } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import React from 'react';
import { HistogramPanel } from './HistogramPanel';
import { defaultTimeseriesSettings, TimeseriesSettings } from './types';
import { cloneDeep, defaults } from 'lodash';
import { Characteristic } from 'data/types';
import { css } from '@emotion/css';
import { Options } from './panelcfg';
import { AnnotationEntity } from './AnnotationPlugin';

type Props = {
  characteristic: Characteristic;
  settings?: TimeseriesSettings;
  fieldConfig?: FieldConfig;
};

export function HistogramComponent({ characteristic, settings, fieldConfig }: Props) {
  const styles = useStyles2(getStyles);

  const settingsWithDefaults = React.useMemo(() => defaults(settings, defaultTimeseriesSettings), [settings]);
  const showLegend = settingsWithDefaults.showLegend;
  const controlName = settingsWithDefaults.controlName;
  const constantsConfig = settingsWithDefaults.constantsConfig;
  const limitConfig = settingsWithDefaults.limitConfig;
  const color = settingsWithDefaults.lineColor;
  const lineWidth = settingsWithDefaults.lineWidth!;
  const fill = settingsWithDefaults.fill!;

  const limits = React.useMemo(
    () => ({
      up:
        limitConfig?.up != null
          ? { value: characteristic?.table?.[limitConfig.up.name], color: limitConfig.up.color }
          : undefined,
      down:
        limitConfig?.down != null
          ? { value: characteristic?.table?.[limitConfig.down.name], color: limitConfig.down.color }
          : undefined,
    }),
    [characteristic?.table, limitConfig]
  );

  const [containerRef, setContainerRef] = React.useState<HTMLElement | null>(null);

  const [height, setHeight] = React.useState<number | undefined>();
  const [width, setWidth] = React.useState<number | undefined>();

  React.useEffect(() => {
    if (containerRef == null) {
      return;
    }

    const ro = new ResizeObserver((entry) => {
      const rect = entry?.[0]?.contentRect;
      if (rect) {
        setWidth(rect.width);
        setHeight(rect.height);
      }
    });
    ro.observe(containerRef);

    return () => {
      ro.disconnect();
    };
  }, [containerRef]);

  const options: Options = React.useMemo(
    () => ({
      bucketOffset: undefined,
      bucketSize: undefined,
      combine: false,

      legend: {
        calcs: [],
        displayMode: 'list' as any,
        placement: 'bottom' as any,
        showLegend: !!showLegend,
      },
      tooltip: {
        mode: 'multi' as any,
        sort: 'asc' as any,
      },
      fieldConfig: fieldConfig,
    }),
    [showLegend,fieldConfig]
  );

  const valueField = characteristic.timeseries?.values;
  const timeField = characteristic.timeseries?.time;

  const series: DataFrame[] = React.useMemo(() => {
    if (!timeField || !valueField) {
      return [];
    }

    const fields = [cloneDeep(timeField), cloneDeep(valueField)];
    fields[1].config = {
      color: {
        mode: 'fixed',
        fixedColor: color,
      },
      custom: {
        lineWidth: lineWidth,
        fillOpacity: fill * 10,
      },
    };

    const df = toDataFrame({
      name: controlName,
      fields,
    });
    return [df];
  }, [color, controlName, fill, lineWidth, timeField, valueField]);

  const constants = React.useMemo(() => {
    return constantsConfig?.items
      ?.map((config) => ({
        title: config.title,
        value: characteristic?.table?.[config.name],
        color: config.color,
        lineWidth: config.lineWidth,
      }))
      ?.filter((c) => c.value != null);
  }, [characteristic?.table, constantsConfig]);

  const annotations = React.useMemo(() => {
    const ann: AnnotationEntity[] = [];
    for (const c of constants ?? []) {
      if (!isNaN(c.value)) {
        ann.push({
          time: c.value,
          type: 'flag',
          title: c.title,
          color: c.color,
          lineWidth: c.lineWidth,
        });
      }
    }
    if (limits.up) {
      ann.push({
        timeStart: limits.up.value,
        type: 'region',
        title: 'Upper',
        color: limits.up.color,
      });
    }
    if (limits.down) {
      ann.push({
        timeEnd: limits.down.value,
        type: 'region',
        title: 'Upper',
        color: limits.down.color,
      });
    }
    return ann;
  }, [constants, limits.down, limits.up]);
  return (
    <div ref={setContainerRef} className={`timeseries-container ${styles.container}`}>
      {width && height ? (
        <HistogramPanel width={width} height={height} options={options} series={series} annotations={annotations} />
      ) : (
        <></>
      )}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css`
      padding: 10px;
      height: 100%;
    `,
  };
};
