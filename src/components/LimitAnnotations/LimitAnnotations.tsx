import React, { useCallback, useMemo, useRef, useState, useEffect, useLayoutEffect } from 'react';
import uPlot from 'uplot';
import { colorManipulator } from '@grafana/data';
import { getTextColorForBackground, UPlotConfigBuilder, useTheme2 } from '@grafana/ui';

const DEFAULT_TIMESERIES_FLAG_COLOR = '#03839e';
const HOVER_RANGE = 30;

export type AnnotationBase = {
  title?: string;
  color?: string;
  lineWidth?: number;
};

export type Flag = AnnotationBase & {
  type: 'flag';
  time: number;
};

export type Region = AnnotationBase & {
  type: 'region';
  timeStart?: number;
  timeEnd?: number;
  fillOpacity: number;
};

export type LimitAnnotation = Flag | Region;

export interface LimitAnnotationConfig {
  minPosition: number;
  maxPosition: number;
  limits: LimitAnnotation[];
}

export type AnnotationsPluginProps = {
  config: UPlotConfigBuilder;
  annotations: LimitAnnotation[];
};

type ConditionFunc = {
  func: (xPos: number) => boolean;
  annotation: LimitAnnotation;
  x: number;
};

type TooltipState = {
  x: number;
  annotation: LimitAnnotation;
  position: 'left' | 'center' | 'right';
};

export function isLimitAnnotation(value: any): value is LimitAnnotation {
  return (value?.type === 'flag' && typeof value?.time === 'number') || value?.type === 'region';
}

export function isLimitAnnotationArray(value: any): value is LimitAnnotation[] {
  if (!Array.isArray(value)) {
    return false;
  }
  for (const en of value) {
    if (!isLimitAnnotation(en)) {
      return false;
    }
  }
  return true;
}

function formatAnnotationLabel(annotation: LimitAnnotation): string {
  const title = annotation.title ?? 'EMPTY';
  if (annotation.type === 'flag' && annotation.time != null) {
    return `${title}: ${Number(annotation.time.toFixed(4))}`;
  }
  if (annotation.type === 'region') {
    const parts: string[] = [];
    if (annotation.timeStart != null) {
      parts.push(Number(annotation.timeStart.toFixed(4)).toString());
    }
    if (annotation.timeEnd != null) {
      parts.push(Number(annotation.timeEnd.toFixed(4)).toString());
    }
    if (parts.length > 0) {
      return `${title}: ${parts.join(' \u2013 ')}`;
    }
  }
  return title;
}

export const LimitAnnotations: React.FC<AnnotationsPluginProps> = ({ annotations, config }) => {
  const theme = useTheme2();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [plot, setPlot] = useState<uPlot>();
  const annotationsRef = useRef<LimitAnnotation[]>();
  const bboxRef = useRef<DOMRect>();
  const conditions = useMemo<ConditionFunc[]>(() => [], []);

  useEffect(() => {
    annotationsRef.current = annotations.sort((a, b) => typeToValue(b.type) - typeToValue(a.type));
  }, [annotations]);

  const onMouseCapture = useCallback(
    (e: MouseEvent) => {
      if (bboxRef.current && annotationsRef.current) {
        const x = e.clientX - bboxRef.current.left;
        for (const cond of conditions) {
          if (cond.func(x)) {
            setTooltip((prev) => {
              if (prev?.annotation === cond.annotation) {
                return prev;
              }
              let position: TooltipState['position'] = 'center';

              if (bboxRef.current?.width) {
                if (cond.x < 0.2 * bboxRef.current.width) {
                  position = 'right';
                } else if (cond.x > 0.8 * bboxRef.current.width) {
                  position = 'left';
                }
              }

              return {
                annotation: cond.annotation,
                x: cond.x,
                position,
              };
            });
            return;
          }
        }
        setTooltip(null);
      }
    },
    [conditions]
  );

  const plotLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  useLayoutEffect(() => {
    config.addHook('init', (u) => {
      u.root.parentElement?.addEventListener('blur', plotLeave);
      u.over.addEventListener('mouseleave', plotLeave);
      u.over.addEventListener('mousemove', onMouseCapture);
      setPlot(u);
    });

    config.addHook('syncRect', (u, rect) => {
      bboxRef.current = rect;
    });

    config.addHook('draw', (u) => {
      if (!annotationsRef.current) {
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

      conditions.length = 0;

      for (let i = 0; i < annotationsRef.current.length; i++) {
        const entity = annotationsRef.current[i];
        const lineColor = entity.color ?? DEFAULT_TIMESERIES_FLAG_COLOR;
        const lineWidth = entity.lineWidth ?? 2;
        if (entity.type === 'flag') {
          renderLine(ctx, u, entity.time, lineColor, lineWidth);
          const xCssPixelPosition = u.valToPos(entity.time, 'x', false);

          conditions.push({
            annotation: entity,
            func: inRange(xCssPixelPosition, HOVER_RANGE),
            x: xCssPixelPosition + u.over.offsetLeft,
          });
        } else if (entity.type === 'region') {
          renderRect(ctx, u, entity.timeStart, entity.timeEnd, lineColor, entity.fillOpacity);

          const x0CssPixelPosition = entity.timeStart ? u.valToPos(entity.timeStart, 'x', false) : undefined;
          const x1CssPixelPosition = entity.timeEnd ? u.valToPos(entity.timeEnd, 'x', false) : undefined;

          const x = x0CssPixelPosition ?? x1CssPixelPosition ?? u.over.clientWidth / 2;

          conditions.push({
            annotation: entity,
            func: rectInRange(x0CssPixelPosition ?? 0, x1CssPixelPosition ?? u.over.clientWidth, HOVER_RANGE),
            x: x + u.over.offsetLeft,
          });
        }
      }
      ctx.restore();
    });

    return () => {
      if (plot) {
        plot.over.removeEventListener('mouseleave', plotLeave);
        plot.root.parentElement?.removeEventListener('blur', plotLeave);
        plot.over.removeEventListener('mousemove', onMouseCapture);
      }
    };
  }, [config, conditions, plotLeave, plot, onMouseCapture]);

  if (!tooltip) {
    return null;
  }

  const backgroundColor = tooltip.annotation.color ?? DEFAULT_TIMESERIES_FLAG_COLOR;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: tooltip.x,
        color: getTextColorForBackground(backgroundColor),
        transform: `translateX(${tooltip.position === 'center' ? -50 : tooltip.position === 'left' ? -100 : 0}%)`,
        backgroundColor,
        paddingLeft: 3,
        paddingRight: 3,
        fontSize: theme.typography.fontSize,
        borderRadius: 2,
        fontFamily: theme.typography.fontFamily,
      }}
    >
      {formatAnnotationLabel(tooltip.annotation)}
    </div>
  );
};

const renderLine = (
  ctx: CanvasRenderingContext2D,
  u: uPlot,
  value: number | undefined,
  color: string,
  lineWidth: number
) => {
  if (value == null) {
    return;
  }
  const x = u.valToPos(value, 'x', true);
  ctx.beginPath();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.moveTo(x, u.bbox.top);
  ctx.lineTo(x, u.bbox.top + u.bbox.height);
  ctx.stroke();
  ctx.closePath();
};

const renderRect = (
  ctx: CanvasRenderingContext2D,
  u: uPlot,
  valStart: number | undefined,
  valEnd: number | undefined,
  color: string,
  opacity: number
) => {
  const x0 = valStart != null ? u.valToPos(valStart, 'x', true) : u.bbox.left;
  const x1 = valEnd != null ? u.valToPos(valEnd, 'x', true) : u.bbox.left + u.bbox.width;
  const fillOpacity = opacity / 100;
  ctx.beginPath();
  ctx.fillStyle = colorManipulator.alpha(color, fillOpacity);
  ctx.rect(x0, u.bbox.top, x1 - x0, u.bbox.height);
  ctx.fill();
  ctx.closePath();
};

const inRange = (value: number, range: number) => (vPos: number) => {
  return vPos >= value - range && vPos <= value + range;
};

const rectInRange = (valueStart: number, valueEnd: number, range: number) => (vPos: number) => {
  return vPos >= valueStart - range && vPos <= valueEnd + range;
};

const typeToValue = (type: LimitAnnotation['type']) => {
  switch (type) {
    case 'flag':
      return 2;
    case 'region':
      return 1;
    default:
      return 0;
  }
};
