import { DataFrame } from '@grafana/data';
import { UPlotConfigBuilder, useTheme2 } from '@grafana/ui';

import { CurveOptions } from 'panelcfg';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { CurveFit } from 'types';
import { createGaussianCurve } from './gaussian';

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
  histogramData: DataFrame;
  rawSeries: DataFrame[];
  curveOptions: CurveOptions;
};

export const BellCurve: React.FC<BellCurveProps> = ({ config, rawSeries, histogramData, curveOptions }) => {
  const [plot, setPlot] = useState<uPlot>();
  const bboxRef = useRef<DOMRect>();
  const { color, lineWidth, fit } = curveOptions;
  const theme = useTheme2();
  const colors = theme.visualization;

  useLayoutEffect(() => {
    config.addHook('init', (u) => {
      setPlot(u);
    });

    config.addHook('syncRect', (u, rect) => {
      bboxRef.current = rect;
    });

    config.addHook('draw', (u) => {
      if (histogramData.length === 0 || rawSeries.length === 0) {
        return;
      }

      let x: number[] = [];
      let y: number[] = [];

      // if (data.meta?.type === DataFrameType.Histogram) {
      if (fit === CurveFit.histogram) {
        if (!histogramData) {
          throw new Error('No histogram data in data frame.');
        }

        const xy = createHistogramCurve(histogramData);
        x = xy.x;
        y = xy.y;
      } else if (fit === CurveFit.gaussian) {
        if (!rawSeries) {
          throw new Error('No histogram data in data frame.');
        }

        const xy = createGaussianCurve(histogramData, rawSeries);
        x = xy.x;
        y = xy.y;
      } else {
        return;
      }

      //}

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
      ctx.strokeStyle = color ? colors.getColorByName(color) : 'dark-blue';
      ctx.lineWidth = lineWidth ? lineWidth : 5;

      const tension = 0.0; //curve's tension

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
  }, [color, colors, config, fit, histogramData, lineWidth, plot, rawSeries]);

  return null;
};

// const renderLine = (
//   ctx: CanvasRenderingContext2D,
//   u: uPlot,
//   xValue: number,
//   yValue: number,
//   color: string,
//   lineWidth: number
// ) => {
//   const x = u.valToPos(xValue, 'x', true);
//   const y = u.valToPos(yValue, 'y', true);

//   ctx.beginPath();
//   ctx.lineWidth = lineWidth;
//   ctx.strokeStyle = color;
//   ctx.moveTo(x, y);
//   ctx.lineTo(x, y + u.bbox.height);
//   ctx.stroke();
//   ctx.closePath();
// };

function createHistogramCurve(frame: DataFrame): { x: number[]; y: number[] } {
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

// function normalDistribution(x: number, mean: number, stdDev: number): number {
//   const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
//   const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
//   return coefficient * Math.exp(exponent);
// }

// Function to generate bell curve data as a DataFrame
// function createGaussianCurve(histogramFrame: DataFrame, rawSeries: DataFrame[] ): { x: number[]; y: number[] } {

//   const x: number[] = [];
//   const y: number[] = [];

//   const histogramStart = histogramFrame.fields.find((f) => f.name === 'xMin')?.values[0];
//   const histogramEnd = histogramFrame.fields.find((f) => f.name === 'xMax')?.values!; //todo get last value
//  const histogramEndValue = histogramEnd[histogramEnd.values.length - 1]
//   //todo: combine all numeric frames from rawSeries into one

//   //todo: calcule mean and standard deviation of all values

//   const steps =  histogramFrame.fields.find((f) => f.name === 'xMin')?.values.length;

//   const step = (end - start) / steps;
//   for (let i = 0; i <= steps; i++) {
//     const x = start + i * step;
//     x.push(x);
//     y.push(normalDistribution(x, mean, stdDev));
//   }

//   return { x, y };
// }

// function createGaussianCurve(histogramFrame: DataFrame, rawSeries: DataFrame[]): { x: number[]; y: number[] } {
//   const x: number[] = [];
//   const y: number[] = [];

//   // Extract histogram start and end
//   const histogramStart = histogramFrame.fields.find((f) => f.name === 'xMin')?.values[0] as number;
//   const histogramEndField = histogramFrame.fields.find((f) => f.name === 'xMax')?.values as number[];
//   const histogramEnd = histogramEndField[histogramEndField.length - 1];

//   // Combine all numeric values from rawSeries
//   const allValues: number[] = [];
//   rawSeries.forEach((frame) => {
//     frame.fields.forEach((field) => {
//       if (field.type === 'number') {
//         for (let i = 0; i < field.values.length; i++) {
//           allValues.push(field.values[i]);
//         }
//       }
//     });
//   });

//   // Calculate mean and standard deviation of all values
//   const dataMean = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
//   const dataStdDev = calculateSampleStandardDeviation(allValues);

//   // Determine the number of steps (bins) and step size
//   const steps = histogramFrame.fields.find((f) => f.name === 'xMin')?.values.length || 100;
//   const stepSize = (histogramEnd - histogramStart) / steps;

//   // Generate Gaussian curve data
//   for (let i = 0; i <= steps; i++) {
//     const xValue = histogramStart + i * stepSize;
//     x.push(xValue);
//     y.push(normalDistribution(xValue, dataMean, dataStdDev));
//   }

//   return { x, y };
// }
