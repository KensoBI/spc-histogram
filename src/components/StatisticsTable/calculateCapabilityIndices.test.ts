import { toDataFrame, FieldType } from '@grafana/data';
import { Options, ControlLine } from 'panelcfg';
import { ControlLineReducerId } from 'data/spcReducers';
import { SpcChartTyp, PositionInput, AggregationType } from 'types';
import { calculateSeriesStatistics } from './calculateCapabilityIndices';

// Data series: five values with mean 3 and overall (sample) std dev sqrt(2.5) ≈ 1.581139.
// Moving ranges are all 1, so sigma-within = mRbar/d2 = 1/1.128 (Minitab individuals default).
const DATA_VALUES = [1, 2, 3, 4, 5];
const SIGMA_OVERALL = Math.sqrt(2.5);
const SIGMA_WITHIN = 1 / 1.128;

function makeOptions(controlLines: ControlLine[], featureQueryRefIds: string[] = []): Options {
  return {
    chartType: SpcChartTyp.none,
    subgroupSize: 1,
    aggregationType: AggregationType.none,
    controlLines,
    curves: [],
    featureQueryRefIds,
  } as unknown as Options;
}

function makeControlLine(overrides: Partial<ControlLine>): ControlLine {
  return {
    name: 'limit',
    field: '',
    positionInput: PositionInput.static,
    seriesIndex: 0,
    lineWidth: 4,
    lineColor: '#000',
    fillDirection: 0,
    fillOpacity: 10,
    reducerId: ControlLineReducerId.lsl,
    ...overrides,
  };
}

const dataFrame = toDataFrame({
  refId: 'B',
  fields: [
    { name: 'time', type: FieldType.time, values: [1, 2, 3, 4, 5] },
    { name: 'value', type: FieldType.number, values: DATA_VALUES },
  ],
});

// Feature frame carrying the spec limits as fields, mirroring provisioning/dashboards.
const featureFrame = toDataFrame({
  refId: 'A',
  fields: [
    { name: 'name', type: FieldType.string, values: ['characteristic1'] },
    { name: 'usl', type: FieldType.number, values: [9] },
    { name: 'lsl', type: FieldType.number, values: [-3] },
  ],
});

describe('calculateSeriesStatistics — spec limits from a feature series', () => {
  const seriesControlLines: ControlLine[] = [
    // seriesIndex 0 → the feature frame in the full (unfiltered) array.
    makeControlLine({ name: 'LSL', reducerId: ControlLineReducerId.lsl, positionInput: PositionInput.series, field: 'lsl', seriesIndex: 0 }),
    makeControlLine({ name: 'USL', reducerId: ControlLineReducerId.usl, positionInput: PositionInput.series, field: 'usl', seriesIndex: 0 }),
  ];

  it('computes capability from feature-series LSL/USL when the full frame array is provided', () => {
    const options = makeOptions(seriesControlLines, ['A']);
    // Statistics run on the data-only frame; the full array (feature + data) is supplied separately.
    const stats = calculateSeriesStatistics([dataFrame], options, [featureFrame, dataFrame]);

    expect(stats).toHaveLength(1);
    // Cp/Cpk against sigma-within, Pp/Ppk against sigma-overall (Minitab convention).
    expect(stats[0].cp).toBeCloseTo(12 / (6 * SIGMA_WITHIN), 4);
    expect(stats[0].cpk).toBeCloseTo(6 / (3 * SIGMA_WITHIN), 4);
    expect(stats[0].pp).toBeCloseTo(12 / (6 * SIGMA_OVERALL), 4);
    expect(stats[0].ppk).toBeCloseTo(6 / (3 * SIGMA_OVERALL), 4);
  });

  it('reproduces the bug: without the feature frame the limits cannot be resolved and Cp/Cpk stay null', () => {
    const options = makeOptions(seriesControlLines, ['A']);
    // Old behaviour — only the filtered data frame is available for field resolution.
    const stats = calculateSeriesStatistics([dataFrame], options);

    expect(stats[0].cp).toBeNull();
    expect(stats[0].cpk).toBeNull();
  });
});

describe('calculateSeriesStatistics — static spec limits (regression)', () => {
  it('still computes capability from static LSL/USL positions', () => {
    const controlLines: ControlLine[] = [
      makeControlLine({ name: 'LSL', reducerId: ControlLineReducerId.lsl, positionInput: PositionInput.static, position: -3, seriesIndex: 0 }),
      makeControlLine({ name: 'USL', reducerId: ControlLineReducerId.usl, positionInput: PositionInput.static, position: 9, seriesIndex: 0 }),
    ];
    const options = makeOptions(controlLines);
    const stats = calculateSeriesStatistics([dataFrame], options);

    expect(stats[0].cp).toBeCloseTo(12 / (6 * SIGMA_WITHIN), 4);
    expect(stats[0].cpk).toBeCloseTo(6 / (3 * SIGMA_WITHIN), 4);
    expect(stats[0].pp).toBeCloseTo(12 / (6 * SIGMA_OVERALL), 4);
  });

  it('returns null capability when only one of LSL/USL is present', () => {
    const controlLines: ControlLine[] = [
      makeControlLine({ name: 'USL', reducerId: ControlLineReducerId.usl, positionInput: PositionInput.static, position: 9, seriesIndex: 0 }),
    ];
    const options = makeOptions(controlLines);
    const stats = calculateSeriesStatistics([dataFrame], options);

    expect(stats[0].cp).toBeNull();
    expect(stats[0].cpk).toBeNull();
  });
});

describe('calculateSeriesStatistics — shared feature limits across multiple data series', () => {
  it('applies a single feature-series LSL/USL to every data series as a default', () => {
    const dataFrame2 = toDataFrame({
      refId: 'C',
      fields: [
        { name: 'time', type: FieldType.time, values: [1, 2, 3, 4, 5] },
        { name: 'value', type: FieldType.number, values: [2, 3, 4, 5, 6] },
      ],
    });

    const controlLines: ControlLine[] = [
      makeControlLine({ name: 'LSL', reducerId: ControlLineReducerId.lsl, positionInput: PositionInput.series, field: 'lsl', seriesIndex: 0 }),
      makeControlLine({ name: 'USL', reducerId: ControlLineReducerId.usl, positionInput: PositionInput.series, field: 'usl', seriesIndex: 0 }),
    ];
    const options = makeOptions(controlLines, ['A']);
    const stats = calculateSeriesStatistics([dataFrame, dataFrame2], options, [featureFrame, dataFrame, dataFrame2]);

    // both series have unit moving ranges, so both get the same sigma-within
    expect(stats[0].cp).toBeCloseTo(12 / (6 * SIGMA_WITHIN), 4);
    expect(stats[1].cp).toBeCloseTo(12 / (6 * SIGMA_WITHIN), 4);
  });
});

describe('calculateSeriesStatistics — Minitab-style report from raw observations', () => {
  // Raw process data, subgrouped in twos for an Xbar-R chart:
  // [1,5] [3,7] [2,8] => plotted subgroup means [3, 5, 5], Rbar = 14/3
  const RAW_VALUES = [1, 5, 3, 7, 2, 8];
  const RAW_MEAN = 26 / 6;
  // overall sample std dev of the raw values
  const RAW_OVERALL = Math.sqrt(RAW_VALUES.reduce((s, v) => s + (v - RAW_MEAN) ** 2, 0) / (RAW_VALUES.length - 1));
  const RBAR_SIGMA = 14 / 3 / 1.128;

  const rawFrame = toDataFrame({
    refId: 'B',
    fields: [
      { name: 'time', type: FieldType.time, values: [1, 2, 3, 4, 5, 6] },
      { name: 'value', type: FieldType.number, values: RAW_VALUES },
    ],
  });

  // What doSpcCalcs produces for the x_XbarR chart: values replaced by subgroup means,
  // chart limits cached in field state.
  const plottedFrame = toDataFrame({
    refId: 'B',
    fields: [
      { name: 'time', type: FieldType.time, values: [1.5, 3.5, 5.5] },
      { name: 'value', type: FieldType.number, values: [3, 5, 5] },
    ],
  });
  plottedFrame.fields[1].state = { calcs: { lcl: -4.44, ucl: 13.1067, mean: 13 / 3 } };

  const controlLines: ControlLine[] = [
    makeControlLine({ name: 'LSL', reducerId: ControlLineReducerId.lsl, positionInput: PositionInput.static, position: -3, seriesIndex: 0 }),
    makeControlLine({ name: 'USL', reducerId: ControlLineReducerId.usl, positionInput: PositionInput.static, position: 9, seriesIndex: 0 }),
  ];

  const options = {
    chartType: SpcChartTyp.x_XbarR,
    subgroupSize: 2,
    aggregationType: AggregationType.none,
    controlLines,
    curves: [],
    featureQueryRefIds: [],
  } as unknown as Options;

  it('reports n, mean, stdDev, min and max of the raw individuals, not the plotted aggregates', () => {
    const stats = calculateSeriesStatistics([plottedFrame], options, [plottedFrame], [rawFrame]);

    expect(stats[0].n).toBe(6);
    expect(stats[0].mean).toBeCloseTo(RAW_MEAN, 10);
    expect(stats[0].stdDev).toBeCloseTo(RAW_OVERALL, 10);
    expect(stats[0].min).toBe(1);
    expect(stats[0].max).toBe(8);
  });

  it('keeps the control chart limits from the plotted chart', () => {
    const stats = calculateSeriesStatistics([plottedFrame], options, [plottedFrame], [rawFrame]);

    expect(stats[0].lcl).toBeCloseTo(-4.44, 10);
    expect(stats[0].ucl).toBeCloseTo(13.1067, 10);
  });

  it('computes Cp/Cpk from Rbar/d2 of the raw subgroups and Pp/Ppk from the raw overall sigma', () => {
    const stats = calculateSeriesStatistics([plottedFrame], options, [plottedFrame], [rawFrame]);

    expect(stats[0].cp).toBeCloseTo(12 / (6 * RBAR_SIGMA), 10);
    expect(stats[0].cpk).toBeCloseTo(
      Math.min((9 - RAW_MEAN) / (3 * RBAR_SIGMA), (RAW_MEAN + 3) / (3 * RBAR_SIGMA)),
      10
    );
    expect(stats[0].pp).toBeCloseTo(12 / (6 * RAW_OVERALL), 10);
    expect(stats[0].ppk).toBeCloseTo(
      Math.min((9 - RAW_MEAN) / (3 * RAW_OVERALL), (RAW_MEAN + 3) / (3 * RAW_OVERALL)),
      10
    );
  });

  it('capability does not depend on which chart of the pair is viewed', () => {
    const rChartOptions = { ...options, chartType: SpcChartTyp.r_XbarR } as Options;
    // For the R chart the plotted values are subgroup ranges, but capability comes from raw data.
    const plottedRanges = toDataFrame({
      refId: 'B',
      fields: [{ name: 'value', type: FieldType.number, values: [4, 4, 6] }],
    });

    const stats = calculateSeriesStatistics([plottedRanges], rChartOptions, [plottedRanges], [rawFrame]);

    expect(stats[0].cp).toBeCloseTo(12 / (6 * RBAR_SIGMA), 10);
    expect(stats[0].pp).toBeCloseTo(12 / (6 * RAW_OVERALL), 10);
  });
});

describe('calculateSeriesStatistics — multiple frames sharing one refId', () => {
  // A Grafana refId identifies the query, not a frame: one query (e.g. Prometheus with several label
  // sets, or a datasource splitting series by timestamp) can return several frames sharing a refId
  // but carrying different measurements. Frame↔frame mappings must stay unique per position.

  it('maps each plotted frame to its own raw frame by position, not to the first refId match', () => {
    // Two plotted frames share refId 'A'; their raw counterparts hold different observations.
    const plottedA1 = toDataFrame({
      refId: 'A',
      fields: [{ name: 'value', type: FieldType.number, values: [1, 2, 3, 4, 5] }],
    });
    const plottedA2 = toDataFrame({
      refId: 'A',
      fields: [{ name: 'value', type: FieldType.number, values: [10, 20, 30] }],
    });
    const rawA1 = toDataFrame({
      refId: 'A',
      fields: [{ name: 'value', type: FieldType.number, values: [1, 2, 3, 4, 5] }],
    });
    const rawA2 = toDataFrame({
      refId: 'A',
      fields: [{ name: 'value', type: FieldType.number, values: [10, 20, 30] }],
    });

    const options = makeOptions([]);
    const stats = calculateSeriesStatistics(
      [plottedA1, plottedA2],
      options,
      [plottedA1, plottedA2],
      [rawA1, rawA2]
    );

    expect(stats).toHaveLength(2);
    // First frame keeps its own raw data.
    expect(stats[0].n).toBe(5);
    expect(stats[0].mean).toBeCloseTo(3, 10);
    expect(stats[0].min).toBe(1);
    expect(stats[0].max).toBe(5);
    // Second frame must use rawA2, not rawA1 (the old refId lookup returned the first 'A').
    expect(stats[1].n).toBe(3);
    expect(stats[1].mean).toBeCloseTo(20, 10);
    expect(stats[1].min).toBe(10);
    expect(stats[1].max).toBe(30);
  });

  it('resolves each frame to its own full-array index when identity differs and refIds repeat', () => {
    // Two data frames share refId 'A'. `allSeries` carries clones (distinct objects, e.g. after the
    // Gaussian-peak recompute), so identity lookup fails and mapping must fall back to in-order refId
    // matching — a plain findIndex by refId would resolve both frames to the first 'A'.
    const makeData = () =>
      toDataFrame({
        refId: 'A',
        fields: [{ name: 'value', type: FieldType.number, values: DATA_VALUES }],
      });

    const dataA1 = makeData();
    const dataA2 = makeData();
    // Full array: a feature frame at index 0, then clones of the two data frames at indices 1 and 2.
    const feature = toDataFrame({
      refId: 'F',
      fields: [{ name: 'name', type: FieldType.string, values: ['c1'] }],
    });
    const allSeries = [feature, makeData(), makeData()];

    // Per-series static limits: seriesIndex 1 spans 12 (Cp large), seriesIndex 2 spans 6 (Cp half).
    const controlLines: ControlLine[] = [
      makeControlLine({ name: 'LSL1', reducerId: ControlLineReducerId.lsl, position: -3, seriesIndex: 1 }),
      makeControlLine({ name: 'USL1', reducerId: ControlLineReducerId.usl, position: 9, seriesIndex: 1 }),
      makeControlLine({ name: 'LSL2', reducerId: ControlLineReducerId.lsl, position: 0, seriesIndex: 2 }),
      makeControlLine({ name: 'USL2', reducerId: ControlLineReducerId.usl, position: 6, seriesIndex: 2 }),
    ];
    const options = makeOptions(controlLines, ['F']);

    const stats = calculateSeriesStatistics([dataA1, dataA2], options, allSeries, [dataA1, dataA2]);

    expect(stats).toHaveLength(2);
    // First frame → full index 1 → spread 12.
    expect(stats[0].cp).toBeCloseTo(12 / (6 * SIGMA_WITHIN), 4);
    // Second frame → full index 2 → spread 6 (would be 12 if it wrongly matched the first 'A').
    expect(stats[1].cp).toBeCloseTo(6 / (6 * SIGMA_WITHIN), 4);
  });
});

describe('calculateSeriesStatistics — multiple value fields in one frame (wide format)', () => {
  // One query returns a wide frame with two measurement columns. The histogram plots a distribution
  // per value field, so each column must get its own statistics row with its own raw values.
  const PART_A = [50.2, 49.8, 51.1, 49.5, 50.8];
  const PART_B = [48.5, 49.1, 47.8, 50.3, 48.9];
  const meanOf = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;

  const wideFrame = toDataFrame({
    refId: 'A',
    fields: [
      { name: 'time', type: FieldType.time, values: [1, 2, 3, 4, 5] },
      { name: 'part_a', type: FieldType.number, values: PART_A },
      { name: 'part_b', type: FieldType.number, values: PART_B },
    ],
  });
  wideFrame.fields[1].state = { calcs: { lcl: 47, ucl: 53, mean: meanOf(PART_A) } };
  wideFrame.fields[2].state = { calcs: { lcl: 45, ucl: 52, mean: meanOf(PART_B) } };

  const options = {
    chartType: SpcChartTyp.x_XmR,
    subgroupSize: 1,
    aggregationType: AggregationType.none,
    controlLines: [],
    curves: [],
    featureQueryRefIds: [],
  } as unknown as Options;

  it('emits one row per value field, each with its own statistics', () => {
    const stats = calculateSeriesStatistics([wideFrame], options, [wideFrame], [wideFrame]);

    expect(stats).toHaveLength(2);
    expect(stats.map((s) => s.seriesName)).toEqual(['part_a', 'part_b']);

    expect(stats[0].mean).toBeCloseTo(meanOf(PART_A), 10);
    expect(stats[0].min).toBe(49.5);
    expect(stats[0].max).toBe(51.1);
    expect(stats[0].lcl).toBe(47);
    expect(stats[0].ucl).toBe(53);

    // part_b must use its own raw values, not part_a's — this is the field-name match, not first-field.
    expect(stats[1].mean).toBeCloseTo(meanOf(PART_B), 10);
    expect(stats[1].min).toBe(47.8);
    expect(stats[1].max).toBe(50.3);
    expect(stats[1].lcl).toBe(45);
    expect(stats[1].ucl).toBe(52);
  });
});
