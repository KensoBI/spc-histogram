import { DataFrame, FieldType } from '@grafana/data';
import { createGaussianCurve } from './gaussian';

function buildHistogramFrame(
  binEdges: number[],
  counts: Array<number | null>,
  extraSeries: Array<Array<number | null>> = []
): DataFrame {
  const xMin = binEdges.slice(0, -1);
  const xMax = binEdges.slice(1);
  return {
    name: 'histogram',
    length: xMin.length,
    fields: [
      { name: 'xMin', type: FieldType.number, config: {}, values: xMin },
      { name: 'xMax', type: FieldType.number, config: {}, values: xMax },
      { name: 'A', type: FieldType.number, config: {}, values: counts },
      ...extraSeries.map((values, i) => ({
        name: `S${i}`,
        type: FieldType.number,
        config: {},
        values,
      })),
    ],
  };
}

// Bin counts sampled from a gaussian with the given parameters
function gaussianCounts(binEdges: number[], amplitude: number, mean: number, stdDev: number): number[] {
  return binEdges.slice(0, -1).map((lo, i) => {
    const center = (lo + binEdges[i + 1]) / 2;
    return amplitude * Math.exp(-0.5 * ((center - mean) / stdDev) ** 2);
  });
}

function makeEdges(min: number, max: number, bins: number): number[] {
  const edges = [];
  for (let i = 0; i <= bins; i++) {
    edges.push(min + ((max - min) * i) / bins);
  }
  return edges;
}

describe('createGaussianCurve', () => {
  it('recovers the parameters of a gaussian-shaped histogram', () => {
    const edges = makeEdges(0, 100, 20);
    const frame = buildHistogramFrame(edges, gaussianCounts(edges, 120, 55, 12));

    const { params } = createGaussianCurve(frame, 0);

    expect(params.amplitude).toBeCloseTo(120, 0);
    expect(params.mean).toBeCloseTo(55, 1);
    expect(params.stdDev).toBeCloseTo(12, 1);
  });

  it('fits data on a very small measurement scale', () => {
    // regression test: a fixed jacobian step of 0.1 made fits like this diverge
    const mean = 0.005;
    const stdDev = 0.0005;
    const edges = makeEdges(0.003, 0.007, 20);
    const frame = buildHistogramFrame(edges, gaussianCounts(edges, 80, mean, stdDev));

    const { params } = createGaussianCurve(frame, 0);

    expect(params.amplitude).toBeCloseTo(80, 0);
    expect(params.mean).toBeCloseTo(mean, 5);
    expect(params.stdDev).toBeCloseTo(stdDev, 5);
  });

  it('samples the curve densely so the peak is not clipped to a bin center', () => {
    // place the true mean between two bin centers
    const edges = makeEdges(0, 10, 5);
    const frame = buildHistogramFrame(edges, gaussianCounts(edges, 100, 4.6, 2));

    const { x, y, params } = createGaussianCurve(frame, 0);

    expect(x.length).toBeGreaterThan(edges.length);
    expect(x[0]).toBeCloseTo(0, 6);
    expect(x[x.length - 1]).toBeCloseTo(10, 6);
    expect(Math.max(...y)).toBeCloseTo(params.amplitude, 1);
  });

  it('concentrates samples on the bell when the joined histogram range is much wider', () => {
    // multi-frame joined histogram: bins span 0-100 but this series only occupies ~10±2
    const edges = makeEdges(0, 100, 50);
    const frame = buildHistogramFrame(edges, gaussianCounts(edges, 100, 10, 2));

    const { x, y, params } = createGaussianCurve(frame, 0);

    expect(params.mean).toBeCloseTo(10, 1);
    // samples stay within mean ± 5σ instead of spreading across the joined range
    expect(x[0]).toBeGreaterThanOrEqual(0);
    expect(x[x.length - 1]).toBeLessThanOrEqual(10 + 5 * 2.5);
    // the peak is fully resolved
    expect(Math.max(...y)).toBeCloseTo(params.amplitude, 1);
  });

  it('treats null counts as zero and still fits the series', () => {
    const edges = makeEdges(0, 100, 20);
    const counts: Array<number | null> = gaussianCounts(edges, 120, 55, 12);
    counts[0] = null;
    counts[counts.length - 1] = null;
    const frame = buildHistogramFrame(edges, counts);

    const { params } = createGaussianCurve(frame, 0);

    expect(params.mean).toBeCloseTo(55, 1);
  });

  it('fits the selected series, not the first one', () => {
    const edges = makeEdges(0, 100, 20);
    const seriesA = gaussianCounts(edges, 120, 30, 8);
    const seriesB = gaussianCounts(edges, 60, 70, 10);
    const frame = buildHistogramFrame(edges, seriesA, [seriesB]);

    const { params } = createGaussianCurve(frame, 1);

    expect(params.mean).toBeCloseTo(70, 1);
    expect(params.amplitude).toBeCloseTo(60, 0);
  });

  it('returns an empty curve for a stale series index instead of crashing', () => {
    const edges = makeEdges(0, 100, 20);
    const frame = buildHistogramFrame(edges, gaussianCounts(edges, 120, 55, 12));

    const curve = createGaussianCurve(frame, 5);

    expect(curve.x).toHaveLength(0);
    expect(curve.y).toHaveLength(0);
    expect(Number.isFinite(curve.params.mean)).toBe(false);
  });

  it('returns an empty curve when all counts fall into a single bin', () => {
    const edges = makeEdges(0, 100, 20);
    const counts = new Array(20).fill(0);
    counts[10] = 50;
    const frame = buildHistogramFrame(edges, counts);

    const curve = createGaussianCurve(frame, 0);

    expect(curve.x).toHaveLength(0);
    expect(Number.isFinite(curve.params.mean)).toBe(false);
  });
});
