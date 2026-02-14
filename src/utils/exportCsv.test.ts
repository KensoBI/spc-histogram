import { buildExportCsv, ResolvedControlLine } from './exportCsv';
import { SeriesStatistics } from 'components/StatisticsTable/calculateCapabilityIndices';

function makeStat(overrides: Partial<SeriesStatistics> & { seriesName: string; seriesIndex: number }): SeriesStatistics {
  return {
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
    ...overrides,
  };
}

function makeHistogram(buckets: { xMin: number[]; xMax: number[]; counts: Record<string, number[]> }): any {
  const fields = [
    { name: 'xMin', values: buckets.xMin, config: {} },
    { name: 'xMax', values: buckets.xMax, config: {} },
    ...Object.entries(buckets.counts).map(([name, values]) => ({
      name,
      values,
      config: {},
    })),
  ];
  return { fields, length: buckets.xMin.length };
}

describe('buildExportCsv', () => {
  const fullStat = makeStat({
    seriesName: 'Temperature',
    seriesIndex: 0,
    n: 100,
    mean: 23.45,
    stdDev: 1.23,
    min: 20.1,
    max: 27.8,
    lcl: 19.76,
    ucl: 27.14,
    cp: 1.33,
    cpk: 1.12,
    pp: 1.28,
    ppk: 1.05,
  });

  it('should generate statistics section with all columns', () => {
    const csv = buildExportCsv([fullStat], [], undefined);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Statistics');
    expect(lines[1]).toBe('Series,n,Mean,Std Dev,Min,Max,LCL,UCL,Cp,Cpk,Pp,Ppk');
    expect(lines[2]).toBe('Temperature,100,23.45,1.23,20.1,27.8,19.76,27.14,1.33,1.12,1.28,1.05');
  });

  it('should respect visible columns filter', () => {
    const csv = buildExportCsv([fullStat], [], undefined, ['n', 'mean', 'stdDev']);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('Series,n,Mean,Std Dev');
    expect(lines[2]).toBe('Temperature,100,23.45,1.23');
  });

  it('should handle null capability values', () => {
    const stat = makeStat({
      seriesName: 'Pressure',
      seriesIndex: 0,
      n: 50,
      mean: 101.2,
      stdDev: 0.85,
      min: 99.1,
      max: 103.5,
    });

    const csv = buildExportCsv([stat], [], undefined);
    const lines = csv.split('\n');

    expect(lines[2]).toBe('Pressure,50,101.2,0.85,99.1,103.5,,,,,,');
  });

  it('should escape CSV special characters in series names', () => {
    const stat = makeStat({
      seriesName: 'Temperature, "high"',
      seriesIndex: 0,
      n: 10,
    });

    const csv = buildExportCsv([stat], [], undefined);
    const lines = csv.split('\n');

    expect(lines[2]).toContain('"Temperature, ""high"""');
  });

  it('should include control lines section', () => {
    const controlLines: ResolvedControlLine[] = [
      { name: 'UCL', seriesName: 'Temperature', type: 'ucl', position: 27.14 },
      { name: 'LCL', seriesName: 'Temperature', type: 'lcl', position: 19.76 },
    ];

    const csv = buildExportCsv([fullStat], controlLines, undefined);
    const sections = csv.split('\n\n');

    expect(sections.length).toBe(2);
    const clLines = sections[1].split('\n');
    expect(clLines[0]).toBe('Control Lines');
    expect(clLines[1]).toBe('Name,Series,Type,Position');
    expect(clLines[2]).toBe('UCL,Temperature,ucl,27.14');
    expect(clLines[3]).toBe('LCL,Temperature,lcl,19.76');
  });

  it('should include histogram section', () => {
    const histogram = makeHistogram({
      xMin: [0, 5, 10],
      xMax: [5, 10, 15],
      counts: { Temperature: [3, 7, 2] },
    });

    const csv = buildExportCsv([fullStat], [], histogram);
    const sections = csv.split('\n\n');

    expect(sections.length).toBe(2);
    const histLines = sections[1].split('\n');
    expect(histLines[0]).toBe('Histogram');
    expect(histLines[1]).toBe('Bucket Min,Bucket Max,Temperature');
    expect(histLines[2]).toBe('0,5,3');
    expect(histLines[3]).toBe('5,10,7');
    expect(histLines[4]).toBe('10,15,2');
  });

  it('should include multi-series histogram', () => {
    const histogram = makeHistogram({
      xMin: [0, 5],
      xMax: [5, 10],
      counts: { Temperature: [3, 7], Pressure: [1, 4] },
    });

    const csv = buildExportCsv([fullStat], [], histogram);
    const sections = csv.split('\n\n');
    const histLines = sections[1].split('\n');

    expect(histLines[1]).toBe('Bucket Min,Bucket Max,Temperature,Pressure');
    expect(histLines[2]).toBe('0,5,3,1');
    expect(histLines[3]).toBe('5,10,7,4');
  });

  it('should handle all three sections together', () => {
    const controlLines: ResolvedControlLine[] = [
      { name: 'UCL', seriesName: 'Temperature', type: 'ucl', position: 27.14 },
    ];
    const histogram = makeHistogram({
      xMin: [0, 5],
      xMax: [5, 10],
      counts: { Temperature: [3, 7] },
    });

    const csv = buildExportCsv([fullStat], controlLines, histogram);
    const sections = csv.split('\n\n');

    expect(sections.length).toBe(3);
    expect(sections[0]).toContain('Statistics');
    expect(sections[1]).toContain('Control Lines');
    expect(sections[2]).toContain('Histogram');
  });

  it('should handle empty statistics', () => {
    const csv = buildExportCsv([], [], undefined);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('Statistics');
    expect(lines[1]).toBe('Series,n,Mean,Std Dev,Min,Max,LCL,UCL,Cp,Cpk,Pp,Ppk');
    expect(lines.length).toBe(2);
  });

  it('should treat empty visibleColumns array as show all', () => {
    const csv = buildExportCsv([fullStat], [], undefined, []);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('Series,n,Mean,Std Dev,Min,Max,LCL,UCL,Cp,Cpk,Pp,Ppk');
  });
});
