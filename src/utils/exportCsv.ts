import { DataFrame, FieldType } from '@grafana/data';
import { Options } from 'panelcfg';
import { controlLineReducers } from 'data/spcReducers';
import { PositionInput } from 'types';
import { SeriesStatistics } from 'components/StatisticsTable/calculateCapabilityIndices';

export interface ResolvedControlLine {
  name: string;
  seriesName: string;
  type: string;
  position: number;
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(fields: Array<string | number | null | undefined>): string {
  return fields.map(escapeCsvField).join(',');
}

const ALL_STAT_COLUMNS = ['n', 'mean', 'stdDev', 'min', 'max', 'lcl', 'ucl', 'cp', 'cpk', 'pp', 'ppk'] as const;

const STAT_HEADERS: Record<string, string> = {
  n: 'n',
  mean: 'Mean',
  stdDev: 'Std Dev',
  min: 'Min',
  max: 'Max',
  lcl: 'LCL',
  ucl: 'UCL',
  cp: 'Cp',
  cpk: 'Cpk',
  pp: 'Pp',
  ppk: 'Ppk',
};

function getVisibleColumns(visibleColumns?: string[]): string[] {
  if (!visibleColumns || visibleColumns.length === 0) {
    return [...ALL_STAT_COLUMNS];
  }
  return ALL_STAT_COLUMNS.filter((col) => visibleColumns.includes(col));
}

export function buildExportCsv(
  statistics: SeriesStatistics[],
  controlLines: ResolvedControlLine[],
  histogram: DataFrame | undefined,
  visibleColumns?: string[]
): string {
  const sections: string[] = [];
  const cols = getVisibleColumns(visibleColumns);

  // Section 1: Statistics
  sections.push(buildStatisticsSection(statistics, cols));

  // Section 2: Control Lines (if any)
  if (controlLines.length > 0) {
    sections.push(buildControlLinesSection(controlLines));
  }

  // Section 3: Histogram (if available)
  if (histogram && histogram.fields.length >= 3) {
    sections.push(buildHistogramSection(histogram));
  }

  return sections.join('\n\n');
}

function buildStatisticsSection(statistics: SeriesStatistics[], cols: string[]): string {
  const lines: string[] = [];

  // Header
  lines.push(csvRow(['Statistics']));
  lines.push(csvRow(['Series', ...cols.map((c) => STAT_HEADERS[c] || c)]));

  // Data rows
  for (const stat of statistics) {
    const values = cols.map((col) => stat[col as keyof SeriesStatistics] as number | null);
    lines.push(csvRow([stat.seriesName, ...values]));
  }

  return lines.join('\n');
}

function buildControlLinesSection(controlLines: ResolvedControlLine[]): string {
  const lines: string[] = [];

  lines.push(csvRow(['Control Lines']));
  lines.push(csvRow(['Name', 'Series', 'Type', 'Position']));

  for (const cl of controlLines) {
    lines.push(csvRow([cl.name, cl.seriesName, cl.type, cl.position]));
  }

  return lines.join('\n');
}

function buildHistogramSection(histogram: DataFrame): string {
  const lines: string[] = [];
  const fields = histogram.fields;

  // fields[0] = xMin, fields[1] = xMax, fields[2..n] = count per series
  const xMinField = fields[0];
  const xMaxField = fields[1];
  const countFields = fields.slice(2);

  lines.push(csvRow(['Histogram']));
  lines.push(csvRow(['Bucket Min', 'Bucket Max', ...countFields.map((f) => f.config?.displayName || f.name || 'Count')]));

  const rowCount = xMinField.values.length;
  for (let i = 0; i < rowCount; i++) {
    const counts = countFields.map((f) => f.values[i] as number | null);
    lines.push(csvRow([xMinField.values[i], xMaxField.values[i], ...counts]));
  }

  return lines.join('\n');
}

export function resolveControlLines(series: DataFrame[], options: Options): ResolvedControlLine[] {
  if (!options.controlLines || options.controlLines.length === 0) {
    return [];
  }

  const computedReducerIds = controlLineReducers.filter((r) => r.computed).map((r) => r.id);
  const resolved: ResolvedControlLine[] = [];

  // Filter out feature query series
  const dataSeries = series.filter(
    (frame) => !options.featureQueryRefIds || !options.featureQueryRefIds.includes(frame.refId!)
  );

  for (const cl of options.controlLines) {
    const seriesIndex = cl.seriesIndex;
    if (seriesIndex < 0 || seriesIndex >= dataSeries.length) {
      continue;
    }

    const frame = dataSeries[seriesIndex];
    const numericField = frame.fields.find((f) => f.type === FieldType.number);
    const seriesName = numericField?.config?.displayName || numericField?.name || frame.name || `Series ${seriesIndex}`;

    let position: number | undefined;

    if (computedReducerIds.includes(cl.reducerId)) {
      // Computed: read from calcs
      const calcs = numericField?.state?.calcs;
      if (calcs) {
        position = calcs[cl.reducerId];
      }
    } else if (cl.positionInput === PositionInput.series) {
      // Series-based: read last value from named field
      const field = frame.fields.find((f) => f.name === cl.field);
      if (field && field.values.length > 0) {
        const lastValue = field.values[field.values.length - 1];
        if (typeof lastValue === 'number') {
          position = lastValue;
        }
      }
    } else {
      // Static position
      position = cl.position;
    }

    if (position != null) {
      resolved.push({
        name: cl.name,
        seriesName,
        type: cl.reducerId,
        position,
      });
    }
  }

  return resolved;
}

export function downloadCsv(csvContent: string, filename: string): void {
  // Note: When Grafana's Plugin Frontend Sandbox is enabled, the sandbox proxy
  // intercepts blob downloads and may replace the filename with a UUID.
  // This is a known sandbox limitation. To get proper filenames, administrators
  // can disable the sandbox for this plugin in Grafana settings.
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateExportFilename(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `spc-statistics_${date}_${time}.csv`;
}
