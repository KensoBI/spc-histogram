import { DataFrame, FieldType } from '@grafana/data';
import { Options, ControlLine } from 'panelcfg';
import { ControlLineReducerId } from 'data/spcReducers';
import { ControlChartConstants, getControlChartConstant } from 'data/calcConst';
import { SpcChartTyp, PositionInput } from 'types';
import { chunkArray, calculateSampleStandardDeviation, calculateMovingRanges } from 'calcs/common';
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
 * @param series      Data-only frames the statistics are computed for (feature frames removed).
 * @param options     Panel options.
 * @param allSeries   The full, unfiltered frame array (including feature frames). Used to resolve
 *                    series-based spec limits whose field lives in a feature frame that is not part
 *                    of `series`. Defaults to `series` for callers without feature queries.
 */
export function calculateSeriesStatistics(
  series: DataFrame[],
  options: Options,
  allSeries: DataFrame[] = series
): SeriesStatistics[] {
  // Resolve LSL/USL from control lines once, against the full frame array, so that
  // feature-series limits (whose field lives in a filtered-out feature frame) resolve correctly.
  const specLimits = resolveSpecLimits(options.controlLines, allSeries);

  return series.map((frame, seriesIndex) => {
    const numericField = frame.fields.find((f) => f.type === FieldType.number);

    if (!numericField) {
      return emptyStatistics(frame.name || `Series ${seriesIndex}`, seriesIndex);
    }

    // Get basic stats — prefer pre-computed calcs, otherwise compute them
    const calcs = numericField.state?.calcs?.count != null
      ? numericField.state.calcs
      : calculateStandardStats(numericField);

    const mean = calcs.mean ?? null;
    const stdDev = calcs.stdDev ?? null;

    // Extract USL/LSL for this series. Control-line seriesIndex is expressed in terms of the
    // full frame array, so map this data frame back to its index there before matching.
    const fullIndex = indexOfFrame(allSeries, frame, seriesIndex);
    const { lsl, usl } = selectSpecLimits(specLimits, fullIndex);

    // Calculate sigma-hat for capability indices
    const rawValues = numericField.values.filter(
      (v: unknown) => v != null && typeof v === 'number' && !Number.isNaN(v)
    );
    const sigmaHat = calculateSigmaHat(rawValues, options.chartType, options.subgroupSize, stdDev);

    // Calculate capability indices
    const { cp, cpk, pp, ppk } = calculateCapability(mean, stdDev, sigmaHat, lsl, usl);

    return {
      seriesName: numericField.config.displayName || numericField.name || frame.name || `Series ${seriesIndex}`,
      seriesIndex,
      n: calcs.count ?? 0,
      mean,
      stdDev,
      min: calcs.min ?? null,
      max: calcs.max ?? null,
      lcl: calcs.lcl ?? null,
      ucl: calcs.ucl ?? null,
      cp,
      cpk,
      pp,
      ppk,
    };
  });
}

function calculateSigmaHat(
  values: number[],
  chartType: SpcChartTyp,
  subgroupSize: number,
  overallStdDev: number | null
): number | null {
  if (values.length === 0) {
    return null;
  }

  switch (chartType) {
    case SpcChartTyp.x_XmR: {
      const movingRanges = calculateMovingRanges(values);
      if (movingRanges.length === 0) {
        return overallStdDev;
      }
      const mrBar = movingRanges.reduce((sum, v) => sum + v, 0) / movingRanges.length;
      const d2 = 1.128; // d2 for n=2
      return mrBar / d2;
    }

    case SpcChartTyp.x_XbarR: {
      if (subgroupSize < 2 || subgroupSize > 25) {
        return overallStdDev;
      }
      const subgroups = chunkArray(values, subgroupSize);
      const ranges = subgroups.map((sg) => Math.max(...sg) - Math.min(...sg));
      const rBar = ranges.reduce((sum, v) => sum + v, 0) / ranges.length;
      const d2 = getControlChartConstant(subgroupSize, ControlChartConstants.d2_xbar_range);
      return rBar / d2;
    }

    case SpcChartTyp.x_XbarS: {
      if (subgroupSize < 2 || subgroupSize > 25) {
        return overallStdDev;
      }
      const subgroups = chunkArray(values, subgroupSize);
      const sValues = subgroups.map(calculateSampleStandardDeviation);
      const sBar = sValues.reduce((sum, v) => sum + v, 0) / sValues.length;
      const c4 = getControlChartConstant(subgroupSize, ControlChartConstants.C4_xbar_sigma);
      return sBar / c4;
    }

    default:
      return overallStdDev;
  }
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

/** Locate a data frame within the full frame array by identity, then refId, falling back to `fallback`. */
function indexOfFrame(allSeries: DataFrame[], frame: DataFrame, fallback: number): number {
  const byIdentity = allSeries.indexOf(frame);
  if (byIdentity >= 0) {
    return byIdentity;
  }
  if (frame.refId != null) {
    const byRefId = allSeries.findIndex((f) => f.refId === frame.refId);
    if (byRefId >= 0) {
      return byRefId;
    }
  }
  return fallback;
}

function calculateCapability(
  mean: number | null,
  stdDev: number | null,
  sigmaHat: number | null,
  lsl: number | null,
  usl: number | null
): { cp: number | null; cpk: number | null; pp: number | null; ppk: number | null } {
  if (mean == null || lsl == null || usl == null) {
    return { cp: null, cpk: null, pp: null, ppk: null };
  }

  let cp: number | null = null;
  let cpk: number | null = null;
  let pp: number | null = null;
  let ppk: number | null = null;

  if (sigmaHat != null && sigmaHat > 0) {
    cp = (usl - lsl) / (6 * sigmaHat);
    cpk = Math.min((usl - mean) / (3 * sigmaHat), (mean - lsl) / (3 * sigmaHat));
  }

  if (stdDev != null && stdDev > 0) {
    pp = (usl - lsl) / (6 * stdDev);
    ppk = Math.min((usl - mean) / (3 * stdDev), (mean - lsl) / (3 * stdDev));
  }

  return { cp, cpk, pp, ppk };
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
