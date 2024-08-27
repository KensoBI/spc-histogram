import { DataFrame } from '@grafana/data';
import { UPlotConfigBuilder, useTheme2 } from '@grafana/ui';
import { CurveOptions } from 'panelcfg';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { CurveFit } from 'types';
import { createGaussianCurve } from './gaussian';
import { createHistogramCurve } from './histogramCurve';

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

      const ctx = u.ctx;
      if (!ctx) {
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(u.bbox.left, u.bbox.top, u.bbox.width, u.bbox.height);
      ctx.clip();

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
