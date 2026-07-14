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

  // Near-zero points are not drawn so the curve does not trace the x axis across
  // bins where the series has no data (joined histograms zero-fill those bins).
  // Zero points directly adjacent to a visible run are kept so segments rise from
  // and fall back to the axis, and the pen is lifted between runs — including
  // across x gaps, since joined multi-series histograms have no bins at all in
  // ranges only covered by other series.
  const valueAt = (i: number) => y[i] ?? 0;
  const threshold = 0.1;

  // typical point spacing (bin width or sample step); larger jumps are gaps
  let typicalGap = Infinity;
  for (let i = 1; i < x.length; i++) {
    const dx = x[i] - x[i - 1];
    if (dx > 0 && dx < typicalGap) {
      typicalGap = dx;
    }
  }
  const isContiguous = (i: number) => x[i] - x[i - 1] <= typicalGap * 1.5;

  let penDown = false;

  for (let i = 0; i < x.length; i++) {
    const visible =
      valueAt(i) >= threshold ||
      (i > 0 && isContiguous(i) && valueAt(i - 1) >= threshold) ||
      (i < y.length - 1 && isContiguous(i + 1) && valueAt(i + 1) >= threshold);

    if (!visible) {
      penDown = false;
      continue;
    }

    const xPos = u.valToPos(x[i], 'x', true);
    const yPos = u.valToPos(valueAt(i), 'y', true);

    if (!penDown || !isContiguous(i)) {
      ctx.moveTo(xPos, yPos);
      penDown = true;
    } else {
      const x0 = u.valToPos(x[i - 1], 'x', true);
      const y0 = u.valToPos(valueAt(i - 1), 'y', true);
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
  const bboxRef = useRef<DOMRect | undefined>(undefined);
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
      // we need at least 2 points
      if (histogramData.length < 2 || rawSeries.length === 0 || !curveOptions) {
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
          ({ x, y } = createGaussianCurve(histogramData, options.seriesIndex));
        } else {
          return;
        }

        const color = colors.getColorByName(options.color ?? 'dark-blue');
        const lineWidth = options.lineWidth ?? parseFloat(theme.spacing(0.625));

        drawCurve(u, ctx, x, y, color, lineWidth);
      });

      ctx.closePath();
      ctx.restore();
    });
  }, [colors, config, curveOptions, histogramData, plot, rawSeries, theme]);

  return null;
};
