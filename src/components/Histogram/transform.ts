import { Field, GrafanaTheme2, DataFrame, getDisplayProcessor, createTheme, DataFrameType } from '@grafana/data';

export interface HistogramFields {
  xMin: Field;
  xMax: Field;
  counts: Field[]; // frequency
}

export function histogramFieldsToFrame(info: HistogramFields, theme?: GrafanaTheme2): DataFrame {
  if (!info.xMin.display) {
    const display = getDisplayProcessor({
      field: info.xMin,
      theme: theme ?? createTheme(),
    });
    info.xMin.display = display;
    info.xMax.display = display;
  }

  // ensure updated units are reflected on the count field used for y axis formatting
  info.counts[0].display = getDisplayProcessor({
    field: info.counts[0],
    theme: theme ?? createTheme(),
  });

  return {
    length: info.xMin.values.length,
    meta: {
      type: DataFrameType.Histogram,
    },
    fields: [info.xMin, info.xMax, ...info.counts],
  };
}
