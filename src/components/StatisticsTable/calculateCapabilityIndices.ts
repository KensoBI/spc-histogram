import { DataFrame, Field, FieldType } from '@grafana/data';
import { Options, ControlLine } from 'panelcfg';
import { ControlLineReducerId } from 'data/spcReducers';
import { PositionInput } from 'types';
import { estimateSigmaWithin, calculateCapability } from 'calcs/capability';
import { calculateStandardStats } from 'calcs/standard';

export interface SeriesStatistics {
  seriesName: string;
  seriesIndex: number;
  n: number;
  mean: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  lcl: number | null;
  ucl: number | null;
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
}

/**
 * Minitab-style capability report: n, mean, stdDev (overall), min and max describe the raw
 * individual observations, Cp/Cpk use the within-subgroup sigma estimate and Pp/Ppk the overall
 * sigma — specification limits apply to individual parts, never to subgroup aggregates.
 * LCL/UCL are the control chart limits and describe the plotted chart.
 *
 * @param series      Plotted data-only frames (feature frames removed; values may be subgroup
 *                    aggregates when a chart type or aggregation is active).
 * @param options     Panel options.
 * @param allSeries   The full, unfiltered frame array (including feature frames), of which `series`
 *                    is an in-order subsequence. Used to resolve series-based spec limits whose field
 *                    lives in a feature frame that is not part of `series`. Defaults to `series` for
 *                    callers without feature queries.
 * @param rawSeries   Pre-aggregation frames holding the raw individual observations, aligned 1:1
 *                    (same length and order) with `series`. Defaults to `series` (correct whenever no
 *                    chart type or aggregation transformed the values).
 *
 * A Grafana `refId` identifies the query, not a frame — one query can return several frames sharing
 * a refId (e.g. one frame per Prometheus label set). Frame↔frame mappings therefore rely on array
 * position, never on refId, so frames with the same refId but different values stay distinct.
 */
export function calculateSeriesStatistics(
  series: DataFrame[],
  options: Options,
  allSeries: DataFrame[] = series,
  rawSeries?: DataFrame[]
): SeriesStatistics[] {
  // Resolve LSL/USL from control lines once, against the full frame array, so that
  // feature-series limits (whose field lives in a filtered-out feature frame) resolve correctly.
  const specLimits = resolveSpecLimits(options.controlLines, allSeries);

  // Resolve each plotted frame's index in the full array once, preserving a unique mapping even
  // when frames share a refId (see the note above about refIds identifying the query, not the frame).
  const fullIndices = mapToFullIndices(series, allSeries);

  return series.flatMap((frame, seriesIndex) => {
    // A single frame can carry several value fields (wide format, e.g. one query returning
    // `sample, part_a, part_b`); the histogram plots a distribution per value field, so each gets
    // its own table row.
    const valueFields = frame.fields.filter((f) => f.type === FieldType.number);

    if (valueFields.length === 0) {
      return [emptyStatistics(frame.name || `Series ${seriesIndex}`, seriesIndex)];
    }

    // Extract USL/LSL for this series. Control-line seriesIndex is expressed in terms of the
    // full frame array, so map this data frame back to its index there before matching.
    const { lsl, usl } = selectSpecLimits(specLimits, fullIndices[seriesIndex]);
    // Raw frames are aligned 1:1 with the plotted frames, so position is the unique counterpart.
    const rawFrame = rawSeries?.[seriesIndex];

    return valueFields.map((numericField) => {
      // Control chart limits belong to the plotted chart, computed by doSpcCalcs.
      const chartCalcs = numericField.state?.calcs;

      // Everything else describes the raw individual observations of this same field.
      const rawField = findRawFieldByName(rawFrame, numericField.name) ?? numericField;
      const rawStats = calculateStandardStats(rawField);
      const mean = rawStats.mean ?? null;
      const sigmaOverall = rawStats.stdDev ?? null;

      const rawValues = rawField.values.filter(
        (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v)
      );
      const sigmaWithin = estimateSigmaWithin(rawValues, options.chartType, options.subgroupSize);

      const { cp, cpk, pp, ppk } = calculateCapability(mean, sigmaWithin, sigmaOverall, lsl, usl);

      return {
        seriesName: numericField.config.displayName || numericField.name || frame.name || `Series ${seriesIndex}`,
        seriesIndex,
        n: rawStats.count ?? 0,
        mean,
        stdDev: sigmaOverall,
        min: rawStats.min ?? null,
        max: rawStats.max ?? null,
        lcl: chartCalcs?.lcl ?? null,
        ucl: chartCalcs?.ucl ?? null,
        cp,
        cpk,
        pp,
        ppk,
      };
    });
  });
}

/** Locate a value field within the raw frame by name so each plotted field maps to its own raw data. */
function findRawFieldByName(rawFrame: DataFrame | undefined, fieldName: string): Field | undefined {
  return rawFrame?.fields.find((f) => f.type === FieldType.number && f.name === fieldName);
}

interface ResolvedSpecLimit {
  reducerId: ControlLineReducerId;
  // Index into the full frame array (the control line's configured series).
  seriesIndex: number;
  position: number;
}

/**
 * Resolve every LSL/USL control line to a numeric position, reading series-based positions from the
 * full frame array so that limits sourced from a feature query resolve to the correct field value.
 */
function resolveSpecLimits(controlLines: ControlLine[] | undefined, allSeries: DataFrame[]): ResolvedSpecLimit[] {
  if (!controlLines || controlLines.length === 0) {
    return [];
  }

  const resolved: ResolvedSpecLimit[] = [];

  for (const cl of controlLines) {
    if (cl.reducerId !== ControlLineReducerId.lsl && cl.reducerId !== ControlLineReducerId.usl) {
      continue;
    }

    const position = resolveControlLinePosition(cl, allSeries);
    if (position == null) {
      continue;
    }

    resolved.push({ reducerId: cl.reducerId, seriesIndex: cl.seriesIndex, position });
  }

  return resolved;
}

function resolveControlLinePosition(cl: ControlLine, allSeries: DataFrame[]): number | null {
  if (cl.positionInput === PositionInput.series && cl.field) {
    const frame = allSeries[cl.seriesIndex];
    if (!frame) {
      return null;
    }
    const field = frame.fields.find((f) => f.name === cl.field);
    if (field && field.values.length > 0) {
      const lastValue = field.values[field.values.length - 1];
      if (typeof lastValue === 'number' && !Number.isNaN(lastValue)) {
        return lastValue;
      }
    }
    return null;
  }

  return typeof cl.position === 'number' && !Number.isNaN(cl.position) ? cl.position : null;
}

/**
 * Pick the LSL/USL that apply to the data series at `dataFullIndex`: a limit configured specifically
 * for that series wins, otherwise the first resolvable limit is used as a shared default (the common
 * case of a single LSL/USL — e.g. from a feature query — applied to all series).
 */
function selectSpecLimits(
  resolved: ResolvedSpecLimit[],
  dataFullIndex: number
): { lsl: number | null; usl: number | null } {
  const pick = (reducerId: ControlLineReducerId): number | null => {
    const specific = resolved.find((r) => r.reducerId === reducerId && r.seriesIndex === dataFullIndex);
    if (specific) {
      return specific.position;
    }
    const shared = resolved.find((r) => r.reducerId === reducerId);
    return shared ? shared.position : null;
  };

  return { lsl: pick(ControlLineReducerId.lsl), usl: pick(ControlLineReducerId.usl) };
}

/**
 * Map every frame in `series` to its index in `allSeries`, preserving a unique mapping even when
 * several frames share a refId. `series` is an in-order subsequence of `allSeries` (only feature
 * frames were removed), so we consume `allSeries` left to right: each plotted frame claims the next
 * position that matches it by identity or refId. Advancing a cursor stops two frames with the same
 * refId from both resolving to the first match, which is the bug a plain `findIndex` by refId causes.
 * A frame with no match (arrays not aligned as expected) falls back to its own position in `series`.
 */
function mapToFullIndices(series: DataFrame[], allSeries: DataFrame[]): number[] {
  const indices: number[] = [];
  let cursor = 0;

  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const frame = series[seriesIndex];
    let matched = -1;

    for (let j = cursor; j < allSeries.length; j++) {
      const candidate = allSeries[j];
      if (candidate === frame || (frame.refId != null && candidate.refId === frame.refId)) {
        matched = j;
        break;
      }
    }

    if (matched >= 0) {
      indices.push(matched);
      cursor = matched + 1;
    } else {
      indices.push(seriesIndex);
    }
  }

  return indices;
}

function emptyStatistics(name: string, seriesIndex: number): SeriesStatistics {
  return {
    seriesName: name,
    seriesIndex,
    n: 0,
    mean: null,
    stdDev: null,
    min: null,
    max: null,
    lcl: null,
    ucl: null,
    cp: null,
    cpk: null,
    pp: null,
    ppk: null,
  };
}
