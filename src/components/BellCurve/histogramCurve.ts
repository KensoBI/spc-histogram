import { DataFrame, Field, FieldType } from '@grafana/data';

export function createHistogramCurve(frame: DataFrame): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];

  if (frame.fields.length !== 3) {
    return { x, y };
  }

  const xMin = frame.fields.find((f) => f.name === 'xMin');
  const xMax = frame.fields.find((f) => f.name === 'xMax');
  const counts = frame.fields[2];

  if (xMin && xMax && counts) {
    for (let i = 0; i < frame.length; i++) {
      const xMean = (xMin.values[i] + xMax.values[i]) / 2;
      x.push(xMean);
      y.push(counts.values[i]);
    }
  }

  return { x, y };
}

// We need to take all fields after xMin and xMax of the histogram frame and calculate the bin centers.
// xMin and xMax are the same across all series.
// When the value of a series for a given bin is null, we set the bin center to null to prevent the series line from being drawn through that bin center.
// The return value is an array of data frames, where each series field is placed into a separate frame.
export function createHistogramCurveFrame(histogramFrame: DataFrame): Field[] | undefined {
  if (histogramFrame.fields.length < 3) {
    return;
  }

  const curveFields: Field[] = [];
  const xMin = histogramFrame.fields.find((f) => f.name === 'xMin');
  const xMax = histogramFrame.fields.find((f) => f.name === 'xMax');
  if (!xMin || !xMax) {
    return;
  }

  // assumes xMin is [0], xMax is [1]
  for (let i = 2; i < histogramFrame.fields.length; i++) {
    //const counts = histogramFrame.fields[i];
    const values: Array<number | null> = [];
    const counts = histogramFrame.fields[i];

    //calculate bin centers
    for (let x = 0; x < histogramFrame.length; x++) {
      const xMean = (xMin.values[x] + xMax.values[x]) / 2;

      if (counts.values[x] !== null) {
        values.push(xMean);
      } else {
        values.push(null);
      }
    }
    curveFields.push({
      name: `${counts.name} (curve)`,
      type: FieldType.number,
      config: {},
      values: values,
      labels: { name: `${counts.name} (curve)` },
    });
  }

  return curveFields;
}
