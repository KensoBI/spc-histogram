import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DataFrame, formattedValueToString, getFieldSeriesColor, GrafanaTheme2 } from '@grafana/data';
import { UPlotConfigBuilder, useStyles2, useTheme2, SeriesTable } from '@grafana/ui';
import { css } from '@emotion/css';
import { CurveOptions } from 'panelcfg';
import { CurveFit } from 'types';
import { createGaussianCurve, gaussianFunction, GaussianParams } from '../BellCurve/gaussian';

const TOOLTIP_OFFSET = 10;

export type HistogramTooltipProps = {
  config: UPlotConfigBuilder;
  histogramFrame: DataFrame;
  curveOptions?: CurveOptions[];
  rawSeries?: DataFrame[];
};

type TooltipState = {
  bucketIndex: number;
  clientX: number;
  clientY: number;
};

const getStyles = (theme: GrafanaTheme2) => ({
  tooltip: css({
    top: 0,
    left: 0,
    zIndex: theme.zIndex.portal,
    whiteSpace: 'pre',
    borderRadius: theme.shape.radius.default,
    position: 'fixed',
    background: theme.colors.background.elevated,
    border: `1px solid ${theme.colors.border.weak}`,
    boxShadow: theme.shadows.z2,
    pointerEvents: 'none',
    padding: theme.spacing(1),
  }),
});

export const HistogramTooltip: React.FC<HistogramTooltipProps> = ({
  config,
  histogramFrame,
  curveOptions,
  rawSeries,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const plotRef = useRef<uPlot>();
  const frameRef = useRef(histogramFrame);
  frameRef.current = histogramFrame;

  // Pre-compute Gaussian params for each curve so we can evaluate on hover
  const gaussianParamsRef = useRef<Map<number, GaussianParams>>(new Map());
  if (curveOptions && rawSeries && histogramFrame.length >= 2) {
    const newParams = new Map<number, GaussianParams>();
    curveOptions.forEach((opt) => {
      if (opt.fit === CurveFit.gaussian) {
        try {
          const result = createGaussianCurve(histogramFrame, rawSeries, opt.seriesIndex);
          if (result.params.mean) {
            newParams.set(opt.seriesIndex, result.params);
          }
        } catch {
          // Gaussian fitting may fail
        }
      }
    });
    gaussianParamsRef.current = newParams;
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    const u = plotRef.current;
    if (!u) {
      return;
    }

    const frame = frameRef.current;
    const xMin = frame.fields[0]?.values;
    const xMax = frame.fields[1]?.values;
    if (!xMin || !xMax || xMin.length === 0) {
      return;
    }

    // Use uPlot's cursor position (relative to plot area)
    const { left, top } = u.cursor;
    if (left == null || top == null || left < 0 || top < 0) {
      setTooltip(null);
      return;
    }

    const xVal = u.posToVal(left, 'x');

    // Find which bucket the cursor falls in
    let bucketIndex = -1;
    for (let i = 0; i < xMin.length; i++) {
      if (xVal >= xMin[i] && xVal < xMax[i]) {
        bucketIndex = i;
        break;
      }
    }

    if (bucketIndex === -1) {
      setTooltip(null);
      return;
    }

    // Convert to viewport coordinates using u.rect (same approach as Grafana's TooltipPlugin2)
    setTooltip({
      bucketIndex,
      clientX: u.rect.left + left,
      clientY: u.rect.top + top,
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  useLayoutEffect(() => {
    config.addHook('init', (u) => {
      plotRef.current = u;
      u.over.addEventListener('mousemove', onMouseMove);
      u.over.addEventListener('mouseleave', onMouseLeave);
    });

    return () => {
      const u = plotRef.current;
      if (u) {
        u.over.removeEventListener('mousemove', onMouseMove);
        u.over.removeEventListener('mouseleave', onMouseLeave);
      }
    };
  }, [config, onMouseMove, onMouseLeave]);

  if (!tooltip) {
    return null;
  }

  const { bucketIndex, clientX, clientY } = tooltip;
  const xMinField = histogramFrame.fields[0];
  const xMaxField = histogramFrame.fields[1];
  const fmt = xMinField.display!;

  const bucketLabel = `Bucket ${formattedValueToString(fmt(xMinField.values[bucketIndex]))} \u2013 ${formattedValueToString(fmt(xMaxField.values[bucketIndex]))}`;

  // Build series rows for each count field (fields[2+])
  const seriesRows: Array<{ color: string; label: string; value: string; isActive?: boolean }> = [];

  for (let i = 2; i < histogramFrame.fields.length; i++) {
    const field = histogramFrame.fields[i];
    const count = field.values[bucketIndex];
    if (count == null) {
      continue;
    }

    const seriesColor = getFieldSeriesColor(field, theme).color;
    seriesRows.push({
      color: seriesColor,
      label: field.name,
      value: String(count),
    });
  }

  // Add Gaussian bell curve values
  if (curveOptions) {
    const binCenter = (xMinField.values[bucketIndex] + xMaxField.values[bucketIndex]) / 2;
    const colors = theme.visualization;

    curveOptions.forEach((opt) => {
      if (opt.fit !== CurveFit.gaussian) {
        return;
      }
      const params = gaussianParamsRef.current.get(opt.seriesIndex);
      if (!params) {
        return;
      }
      const curveValue = gaussianFunction(binCenter, params);
      const color = opt.color ? colors.getColorByName(opt.color) : 'dark-blue';
      seriesRows.push({
        color,
        label: opt.name || `Gaussian (series ${opt.seriesIndex})`,
        value: curveValue.toFixed(1),
      });
    });
  }

  if (seriesRows.length === 0) {
    return null;
  }

  const tooltipContent = (
    <div
      className={styles.tooltip}
      style={{
        transform: `translateX(${clientX + TOOLTIP_OFFSET}px) translateY(${clientY + TOOLTIP_OFFSET}px)`,
      }}
    >
      <SeriesTable timestamp={bucketLabel} series={seriesRows} />
    </div>
  );

  return createPortal(tooltipContent, document.body);
};
