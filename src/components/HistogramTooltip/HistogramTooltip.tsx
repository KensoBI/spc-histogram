import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DataFrame, FieldType, formattedValueToString, getDisplayProcessor, getFieldSeriesColor, GrafanaTheme2 } from '@grafana/data';
import { UPlotConfigBuilder, useStyles2, useTheme2, SeriesTable, SeriesTableRow } from '@grafana/ui';
import { css } from '@emotion/css';
import { CurveOptions } from 'panelcfg';
import { CurveFit } from 'types';
import { createGaussianCurve, gaussianFunction, GaussianParams } from '../BellCurve/gaussian';
import { LimitAnnotation } from '../LimitAnnotations/LimitAnnotations';

const TOOLTIP_OFFSET = 10;
const CONTROL_LINE_HOVER_RANGE = 30;

export type HistogramTooltipProps = {
  config: UPlotConfigBuilder;
  histogramFrame: DataFrame;
  annotations?: LimitAnnotation[];
  curveOptions?: CurveOptions[];
  rawSeries?: DataFrame[];
};

type TooltipState = {
  bucketIndex: number | null;
  annotation: LimitAnnotation | null;
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
    background: theme.colors.background.primary, //todo use theme.colors.background.elevated in Grafana v12
    border: `1px solid ${theme.colors.border.weak}`,
    boxShadow: theme.shadows.z2,
    pointerEvents: 'none',
    padding: theme.spacing(1),
  }),
  divider: css({
    margin: theme.spacing(0.5, 0),
    border: 'none',
    borderTop: `1px solid ${theme.colors.border.weak}`,
  }),
});

export const HistogramTooltip: React.FC<HistogramTooltipProps> = ({
  config,
  histogramFrame,
  annotations,
  curveOptions,
  rawSeries,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const plotRef = useRef<uPlot | undefined>(undefined);
  const frameRef = useRef(histogramFrame);
  const annotationsRef = useRef(annotations);

  // Update refs when props change
  useEffect(() => {
    frameRef.current = histogramFrame;
  }, [histogramFrame]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Get value formatter from the first numeric field in raw series (respects Standard Options > Decimals)
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const formatValue = useMemo(() => {
    if (rawSeries) {
      for (const frame of rawSeries) {
        for (const field of frame.fields) {
          if (field.type === FieldType.number) {
            const display = field.display ?? getDisplayProcessor({ field, theme });
            return (v: number) => formattedValueToString(display(v));
          }
        }
      }
    }
    return (v: number) => String(v);
  }, [rawSeries, theme]);

  // Pre-compute Gaussian params for each curve so we can evaluate on hover
  // Keyed by curve index (position in curveOptions array) to support multiple curves per series
  const gaussianParams = useMemo(() => {
    if (curveOptions && rawSeries && histogramFrame.length >= 2) {
      const params = new Map<number, GaussianParams>();
      curveOptions.forEach((opt, curveIndex) => {
        if (opt.fit === CurveFit.gaussian) {
          try {
            const result = createGaussianCurve(histogramFrame, rawSeries, opt.seriesIndex);
            if (result.params.mean) {
              params.set(curveIndex, result.params);
            }
          } catch {
            // Gaussian fitting may fail
          }
        }
      });
      return params;
    }
    return new Map<number, GaussianParams>();
  }, [curveOptions, rawSeries, histogramFrame]);

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

    const clientX = u.rect.left + left;
    const clientY = u.rect.top + top;

    // Find closest control line annotation
    let hoveredAnnotation: LimitAnnotation | null = null;
    const currentAnnotations = annotationsRef.current;
    if (currentAnnotations && currentAnnotations.length > 0) {
      const cursorCssX = left;
      for (const annotation of currentAnnotations) {
        if (annotation.type === 'flag' && annotation.time != null) {
          const lineX = u.valToPos(annotation.time, 'x', false);
          if (Math.abs(cursorCssX - lineX) <= CONTROL_LINE_HOVER_RANGE) {
            hoveredAnnotation = annotation;
            break;
          }
        } else if (annotation.type === 'region') {
          const x0 = annotation.timeStart != null ? u.valToPos(annotation.timeStart, 'x', false) : 0;
          const x1 = annotation.timeEnd != null ? u.valToPos(annotation.timeEnd, 'x', false) : u.over.clientWidth;
          if (cursorCssX >= x0 - CONTROL_LINE_HOVER_RANGE && cursorCssX <= x1 + CONTROL_LINE_HOVER_RANGE) {
            hoveredAnnotation = annotation;
            break;
          }
        }
      }
    }

    // Find which bucket the cursor falls in
    const xVal = u.posToVal(left, 'x');
    let bucketIndex: number | null = null;
    for (let i = 0; i < xMin.length; i++) {
      if (xVal >= xMin[i] && xVal < xMax[i]) {
        bucketIndex = i;
        break;
      }
    }

    if (hoveredAnnotation == null && bucketIndex == null) {
      setTooltip(null);
      return;
    }

    setTooltip({ annotation: hoveredAnnotation, bucketIndex, clientX, clientY });
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

  const defaultAnnotationColor = theme.colors.primary.main;
  const annotationContent = tooltip.annotation
    ? renderAnnotationTooltip(tooltip.annotation, formatValue, defaultAnnotationColor)
    : null;
  const bucketContent = tooltip.bucketIndex != null
    ? renderBucketTooltip(tooltip.bucketIndex, histogramFrame, curveOptions, theme, gaussianParams, formatValue)
    : null;

  if (!annotationContent && !bucketContent) {
    return null;
  }

  const content = (
    <>
      {annotationContent}
      {annotationContent && bucketContent && <hr className={styles.divider} />}
      {bucketContent}
    </>
  );

  const tooltipEl = (
    <div
      className={styles.tooltip}
      style={{
        transform: `translateX(${tooltip.clientX + TOOLTIP_OFFSET}px) translateY(${tooltip.clientY + TOOLTIP_OFFSET}px)`,
      }}
    >
      {content}
    </div>
  );

  return createPortal(tooltipEl, document.body);
};

function renderAnnotationTooltip(annotation: LimitAnnotation, formatValue: (v: number) => string, defaultColor: string): React.ReactNode {
  const title = annotation.title ?? 'EMPTY';
  if (annotation.type === 'flag' && annotation.time != null) {
    return (
      <SeriesTable
        series={[{
          color: annotation.color ?? defaultColor,
          label: title,
          value: formatValue(annotation.time),
        }]}
      />
    );
  }
  if (annotation.type === 'region') {
    const parts: string[] = [];
    if (annotation.timeStart != null) {
      parts.push(formatValue(annotation.timeStart));
    }
    if (annotation.timeEnd != null) {
      parts.push(formatValue(annotation.timeEnd));
    }
    return (
      <SeriesTable
        series={[{
          color: annotation.color ?? defaultColor,
          label: title,
          value: parts.join(' \u2013 '),
        }]}
      />
    );
  }
  return <SeriesTableRow label={title} color={annotation.color ?? defaultColor} value="" />;
}

function renderBucketTooltip(
  bucketIndex: number,
  histogramFrame: DataFrame,
  curveOptions: CurveOptions[] | undefined,
  theme: any,
  gaussianParams: Map<number, GaussianParams>,
  formatValue: (v: number) => string
): React.ReactNode {
  const xMinField = histogramFrame.fields[0];
  const xMaxField = histogramFrame.fields[1];
  const fmt = xMinField.display!;

  const bucketLabel = `Bucket ${formattedValueToString(fmt(xMinField.values[bucketIndex]))} \u2013 ${formattedValueToString(fmt(xMaxField.values[bucketIndex]))}`;

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

  if (curveOptions) {
    const binCenter = (xMinField.values[bucketIndex] + xMaxField.values[bucketIndex]) / 2;
    const colors = theme.visualization;

    curveOptions.forEach((opt, curveIndex) => {
      const color = opt.color ? colors.getColorByName(opt.color) : 'dark-blue';

      if (opt.fit === CurveFit.gaussian) {
        const params = gaussianParams.get(curveIndex);
        if (!params) {
          return;
        }
        const curveValue = gaussianFunction(binCenter, params);
        if (curveValue < 0.1) {
          return;
        }
        seriesRows.push({
          color,
          label: opt.fit,
          value: formatValue(curveValue),
        });
      } else if (opt.fit === CurveFit.histogram) {
        // Histogram curve value is the count at this bucket for the target series
        const countField = histogramFrame.fields[2 + opt.seriesIndex];
        if (countField) {
          const count = countField.values[bucketIndex];
          if (count != null) {
            seriesRows.push({
              color,
              label: opt.fit,
              value: String(count),
            });
          }
        }
      }
    });
  }

  if (seriesRows.length === 0) {
    return null;
  }

  return <SeriesTable timestamp={bucketLabel} series={seriesRows} />;
}
