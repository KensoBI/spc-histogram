import { arrayToDataFrame, DataFrame, DataFrameType, Field } from '@grafana/data';
import { UPlotConfigBuilder } from '@grafana/ui';
import React, { useLayoutEffect, useRef, useState } from 'react';

// const BellCurve: React.FC<PlotProps> = ({ data, width, height }) => {
// 	const histogramData = data[0];
// 	const { mean, stdDev, totalCount } = calculateStats(histogramData);

// 	// Calculate the bin width
// 	const xValues = histogramData.fields.find(f => f.name === 'value')?.values.toArray() ?? [];
// 	const binWidth = xValues.length > 1 ? xValues[1] - xValues[0] : 1;

// 	// Calculate the scale factor
// 	const histogramMax = Math.max(...histogramData.fields.find(f => f.name === 'count')?.values.toArray() ?? []);
// 	const theoreticalMax = normalDistribution(mean, mean, stdDev);
// 	const scaleFactor = (histogramMax / theoreticalMax) * (binWidth * totalCount);

// 	const bellCurveData = generateBellCurveData(
// 	  mean,
// 	  stdDev,
// 	  xValues[0],
// 	  xValues[xValues.length - 1],
// 	  100,
// 	  scaleFactor
// 	);

// 	const combinedData = [histogramData, bellCurveData];

// 	const customSeriesConfig = {
// 	  [bellCurveData.refId]: {
// 		lineWidth: 2,
// 		lineColor: 'red',
// 		lineInterpolation: curveBasis,
// 		showPoints: false,
// 	  },
// 	};

// 	return (
// 	  <TimeSeries
// 			width={width}
// 			height={height} timeZone={''}
// 			legend={undefined} timeRange={undefined} frames={[]}

// 	  />
// 	);
//   };

export type BellCurveProps = {
  config: UPlotConfigBuilder;
  data?: DataFrame;
  color?: string;
  lineWidth?: number;
};

function normalDistribution(x: number, mean: number, stdDev: number): number {
  const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
  return coefficient * Math.exp(exponent);
}

// Function to generate bell curve data as a DataFrame
function generateBellCurveData(field: Field, steps: number): DataFrame {
  const xValues: number[] = [];
  const yValues: number[] = [];

  const mean = field.state?.calcs?.mean;
  const stdDev = field.state?.calcs?.stdDev;

  if (mean === undefined || stdDev === undefined) {
    throw new Error('Mean and standard deviation must be defined');
  }

  // Ensure field.values is defined and not empty
  if (!field.values || field.values.length === 0) {
    throw new Error('Field values must be defined and non-empty');
  }

  // Define the start and end points based on field.values
  const start = field.values[0];
  const end = field.values[field.values.length - 1];

  const step = (end - start) / steps;
  for (let i = 0; i <= steps; i++) {
    const x = start + i * step;
    xValues.push(x);
    yValues.push(normalDistribution(x, mean, stdDev));
  }

  const df = arrayToDataFrame(xValues);
  df.fields.concat(arrayToDataFrame(yValues).fields);
  return df;
}

export const BellCurve: React.FC<BellCurveProps> = ({ config, data }) => {
  const [plot, setPlot] = useState<uPlot>();
  //const annotationsRef = useRef<LimitAnnotation[]>();
  const bboxRef = useRef<DOMRect>();

  // useEffect(() => {
  //   annotationsRef.current = annotations.sort((a, b) => typeToValue(b.type) - typeToValue(a.type));
  // }, [annotations]);

  useLayoutEffect(() => {
    config.addHook('init', (u) => {
      setPlot(u);
    });

    config.addHook('syncRect', (u, rect) => {
      bboxRef.current = rect;
    });

    config.addHook('draw', (u) => {
      // if (!annotationsRef.current) {
      //   return;
      // }
      if (!data || data.length === 0) {
        return;
      }

      let x: number[] = [];
      let y: number[] = [];

      if (data.meta?.type === DataFrameType.Histogram) {
        //center line for y-axis
        const xy = prepXYfromHistogram(data);
        x = xy.x;
        y = xy.y;
      }

      const ctx = u.ctx;
      if (!ctx) {
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
      ctx.clip();

      // ctx.beginPath();
      // ctx.strokeStyle = 'green';
      // ctx.lineWidth = 2;

      // for (let i = 0; i < data.length; i++) {
      //   const xPos = u.valToPos(x[i], 'x', true);
      //   const yPos = u.valToPos(y[i] + 20, 'y', true);

      //   if (i === 0) {
      //     ctx.moveTo(xPos, yPos);
      //   } else {
      //     ctx.lineTo(xPos, yPos);
      //   }
      // }
      // ctx.stroke();
      // ctx.closePath();

      ctx.beginPath();
      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2;

      const tension = 0.2; //curve's tension

      for (let i = 0; i < x.length; i++) {
        const xPos = u.valToPos(x[i], 'x', true);
        const yPos = u.valToPos(y[i], 'y', true);

        if (i === 0) {
          ctx.moveTo(xPos, yPos);
        } else {
          const x0 = u.valToPos(x[i - 1], 'x', true);
          const y0 = u.valToPos(y[i - 1], 'y', true);
          const x1 = xPos;
          const y1 = yPos;

          const controlX1 = x0 + (x1 - x0) * tension;
          const controlY1 = y0;
          const controlX2 = x1 - (x1 - x0) * tension;
          const controlY2 = y1;

          ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, x1, y1);
        }
      }

      ctx.stroke();
      ctx.closePath();

      ctx.restore();
    });
  }, [config, data, plot]);

  return null;
};

const renderLine = (
  ctx: CanvasRenderingContext2D,
  u: uPlot,
  xValue: number,
  yValue: number,
  color: string,
  lineWidth: number
) => {
  const x = u.valToPos(xValue, 'x', true);
  const y = u.valToPos(yValue, 'y', true);

  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + u.bbox.height);
  ctx.stroke();
  ctx.closePath();
};

function prepXYfromHistogram(frame: DataFrame): { x: number[]; y: number[] } {
  const xMin = frame.fields.find((f) => f.name === 'xMin');
  const xMax = frame.fields.find((f) => f.name === 'xMax');
  const counts = frame.fields.find((f) => f.name === 'value');
  const x: number[] = [];
  const y: number[] = [];

  if (xMin && xMax && counts) {
    for (let i = 0; i < frame.length; i++) {
      const xMean = (xMin.values[i] + xMax.values[i]) / 2;
      x.push(xMean);

      y.push(counts.values[i]);
    }
  }

  return { x, y };
}
