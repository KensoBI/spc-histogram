import React, { useMemo } from 'react';
import { DataFrame, FieldType, getDisplayProcessor, formattedValueToString, GrafanaTheme2 } from '@grafana/data';
import { InteractiveTable } from '@grafana/ui';
import { CellProps } from 'react-table';
import { Options } from 'panelcfg';
import { SpcChartTyp } from 'types';
import { calculateSeriesStatistics, SeriesStatistics } from './calculateCapabilityIndices';

interface StatisticsTableProps {
  series: DataFrame[];
  options: Options;
  theme: GrafanaTheme2;
}

type TableRow = SeriesStatistics & { id: string };

function useFormatValue(series: DataFrame[], theme: GrafanaTheme2) {
  return useMemo(() => {
    // Find the first numeric field to get display processor config (unit, decimals, etc.)
    for (const frame of series) {
      for (const field of frame.fields) {
        if (field.type === FieldType.number) {
          const display =
            field.display ??
            getDisplayProcessor({
              field,
              theme,
            });
          return (value: number | null): string => {
            if (value == null) {
              return '–';
            }
            return formattedValueToString(display(value));
          };
        }
      }
    }
    // Fallback if no numeric field found
    return (value: number | null): string => {
      if (value == null) {
        return '–';
      }
      return String(value);
    };
  }, [series, theme]);
}

export const StatisticsTable: React.FC<StatisticsTableProps> = ({ series, options, theme }) => {
  const formatValue = useFormatValue(series, theme);

  const statistics = useMemo(() => calculateSeriesStatistics(series, options), [series, options]);

  const tableData: TableRow[] = useMemo(
    () => statistics.map((stat) => ({ ...stat, id: String(stat.seriesIndex) })),
    [statistics]
  );

  const showControlLimits = options.chartType !== SpcChartTyp.none;
  const hasCapabilityData = statistics.some((s) => s.cp != null);

  const columns = useMemo(
    () => [
      {
        id: 'seriesName' as const,
        header: 'Series',
        sortType: 'string' as const,
      },
      {
        id: 'n' as const,
        header: 'n',
        cell: ({ row }: CellProps<TableRow>) => row.original.n,
        sortType: 'number' as const,
      },
      {
        id: 'mean' as const,
        header: 'Mean',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.mean),
        sortType: 'number' as const,
      },
      {
        id: 'stdDev' as const,
        header: 'Std Dev',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.stdDev),
        sortType: 'number' as const,
      },
      {
        id: 'min' as const,
        header: 'Min',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.min),
        sortType: 'number' as const,
      },
      {
        id: 'max' as const,
        header: 'Max',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.max),
        sortType: 'number' as const,
      },
      {
        id: 'lcl' as const,
        header: 'LCL',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.lcl),
        sortType: 'number' as const,
        visible: () => showControlLimits,
      },
      {
        id: 'ucl' as const,
        header: 'UCL',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.ucl),
        sortType: 'number' as const,
        visible: () => showControlLimits,
      },
      {
        id: 'cp' as const,
        header: 'Cp',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.cp),
        sortType: 'number' as const,
        visible: () => hasCapabilityData,
      },
      {
        id: 'cpk' as const,
        header: 'Cpk',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.cpk),
        sortType: 'number' as const,
        visible: () => hasCapabilityData,
      },
      {
        id: 'pp' as const,
        header: 'Pp',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.pp),
        sortType: 'number' as const,
        visible: () => hasCapabilityData,
      },
      {
        id: 'ppk' as const,
        header: 'Ppk',
        cell: ({ row }: CellProps<TableRow>) => formatValue(row.original.ppk),
        sortType: 'number' as const,
        visible: () => hasCapabilityData,
      },
    ],
    [formatValue, showControlLimits, hasCapabilityData]
  );

  if (tableData.length === 0) {
    return null;
  }

  return (
    <InteractiveTable
      columns={columns}
      data={tableData}
      getRowId={(row: TableRow) => row.id}
    />
  );
};
