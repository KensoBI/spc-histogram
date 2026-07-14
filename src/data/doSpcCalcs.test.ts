import { toDataFrame, FieldType } from '@grafana/data';
import { Options } from 'panelcfg';
import { SpcChartTyp, AggregationType } from 'types';
import { doSpcCalcs } from './doSpcCalcs';

function makeOptions(overrides: Partial<Options>): Options {
  return {
    chartType: SpcChartTyp.none,
    subgroupSize: 1,
    aggregationType: AggregationType.none,
    controlLines: [],
    curves: [],
    featureQueryRefIds: [],
    ...overrides,
  } as unknown as Options;
}

function valueField(values: Array<number | null>) {
  const frame = toDataFrame({
    refId: 'A',
    fields: [{ name: 'value', type: FieldType.number, values }],
  });
  return frame;
}

describe('doSpcCalcs — nulls inside subgroups', () => {
  it('aggregates the subgroup mean over valid numbers only, not counting nulls as 0', () => {
    // subgroups of 2: [10, null] -> 10 (not 5), [20, 30] -> 25, [null, null] -> gap
    const frame = valueField([10, null, 20, 30, null, null]);
    const options = makeOptions({ subgroupSize: 2, aggregationType: AggregationType.Mean });

    const [result] = doSpcCalcs([frame], options);

    expect(result.fields[0].values).toEqual([10, 25, null]);
  });

  it('computes the subgroup range over valid numbers only and yields a gap for an empty subgroup', () => {
    // [5, null] -> 0 (single valid value), [2, 8] -> 6, [null, null] -> gap
    const frame = valueField([5, null, 2, 8, null, null]);
    const options = makeOptions({ subgroupSize: 2, aggregationType: AggregationType.Range });

    const [result] = doSpcCalcs([frame], options);

    expect(result.fields[0].values).toEqual([0, 6, null]);
  });

  it('treats a moving range across a null neighbour as an undefined gap', () => {
    // [10, 13, null, 20] -> |13-10|=3, then null (value is null), then null (previous is null)
    const frame = valueField([10, 13, null, 20]);
    const options = makeOptions({ subgroupSize: 1, aggregationType: AggregationType.MovingRange });

    const [result] = doSpcCalcs([frame], options);

    expect(result.fields[0].values).toEqual([3, null, null]);
  });

  it('excludes nulls from the cached numeric range', () => {
    const frame = valueField([10, null, 20, 30, null, null]);
    const options = makeOptions({ subgroupSize: 2, aggregationType: AggregationType.Mean });

    const [result] = doSpcCalcs([frame], options);

    // range is computed over the aggregated valid values [10, 25]; the null gap must not pull min to 0.
    expect(result.fields[0].state?.range).toEqual({ min: 10, max: 25, delta: 15 });
  });
});
