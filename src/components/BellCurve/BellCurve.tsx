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
  curveOptions: CurveOptions[];
};

const drawCurve = (
  u: uPlot,
  ctx: CanvasRenderingContext2D,
  x: number[],
  y: number[],
  color: string,
  lineWidth: number
) => {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  const tension = 0.0;

  for (let i = 0; i < x.length; i++) {
    const xPos = u.valToPos(x[i], 'x', true);
    const yPos = u.valToPos(y[i], 'y', true);

    if (y[i] < 0.1) {
      continue;
    }

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
};

export const BellCurve: React.FC<BellCurveProps> = ({ config, rawSeries, histogramData, curveOptions }) => {
  const [plot, setPlot] = useState<uPlot>();
  const bboxRef = useRef<DOMRect>();
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
      if (histogramData.length === 0 || rawSeries.length === 0 || !curveOptions) {
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

      curveOptions.forEach((options) => {
        let x: number[], y: number[];

        if (options.fit === CurveFit.histogram) {
          ({ x, y } = createHistogramCurve(histogramData, options.seriesIndex));
        } else if (options.fit === CurveFit.gaussian) {
          ({ x, y } = createGaussianCurve(histogramData, rawSeries, options.seriesIndex));
        } else {
          return;
        }

        const color = options.color ? colors.getColorByName(options.color) : 'dark-blue';
        const lineWidth = options.lineWidth || 5;

        drawCurve(u, ctx, x, y, color, lineWidth);
      });

      ctx.closePath();
      ctx.restore();
    });
  }, [colors, config, curveOptions, histogramData, plot, rawSeries]);

  return null;
};
