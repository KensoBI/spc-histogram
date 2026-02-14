import { DataFrame, FieldType } from '@grafana/data';
import { Options, ControlLine } from 'panelcfg';
import { ControlLineReducerId } from 'data/spcReducers';
import { ControlChartConstants, getControlChartConstant } from 'data/calcConst';
import { SpcChartTyp } from 'types';
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

export function calculateSeriesStatistics(series: DataFrame[], options: Options): SeriesStatistics[] {
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

    // Extract USL/LSL from control lines for this series
    const { lsl, usl } = extractSpecLimits(options.controlLines, seriesIndex);

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

function extractSpecLimits(
  controlLines: ControlLine[],
  seriesIndex: number
): { lsl: number | null; usl: number | null } {
  let lsl: number | null = null;
  let usl: number | null = null;

  for (const cl of controlLines) {
    if (cl.seriesIndex !== seriesIndex) {
      continue;
    }
    if (cl.reducerId === ControlLineReducerId.lsl && cl.position != null) {
      lsl = cl.position;
    }
    if (cl.reducerId === ControlLineReducerId.usl && cl.position != null) {
      usl = cl.position;
    }
  }

  return { lsl, usl };
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
