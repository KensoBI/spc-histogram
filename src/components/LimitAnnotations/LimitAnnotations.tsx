import React, { useRef, useEffect, useLayoutEffect } from 'react';
import uPlot from 'uplot';
import { colorManipulator } from '@grafana/data';
import { UPlotConfigBuilder } from '@grafana/ui';

const DEFAULT_TIMESERIES_FLAG_COLOR = '#03839e';

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

export const LimitAnnotations: React.FC<AnnotationsPluginProps> = ({ annotations, config }) => {
  const annotationsRef = useRef<LimitAnnotation[]>();

  useEffect(() => {
    annotationsRef.current = annotations.sort((a, b) => typeToValue(b.type) - typeToValue(a.type));
  }, [annotations]);

  useLayoutEffect(() => {
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

      for (let i = 0; i < annotationsRef.current.length; i++) {
        const entity = annotationsRef.current[i];
        const lineColor = entity.color ?? DEFAULT_TIMESERIES_FLAG_COLOR;
        const lineWidth = entity.lineWidth ?? 2;
        if (entity.type === 'flag') {
          renderLine(ctx, u, entity.time, lineColor, lineWidth);
        } else if (entity.type === 'region') {
          renderRect(ctx, u, entity.timeStart, entity.timeEnd, lineColor, entity.fillOpacity);
        }
      }
      ctx.restore();
    });
  }, [config]);

  return null;
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
