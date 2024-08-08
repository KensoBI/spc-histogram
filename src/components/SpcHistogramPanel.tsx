import React, { useCallback, useMemo } from 'react';
import { buildHistogram, getHistogramFields } from '@grafana/data';
import { histogramFieldsToFrame } from '../data/transform';
import { useTheme2 } from '@grafana/ui';
import { Histogram, getBucketSize } from './Histogram/Histogram';
import { LimitAnnotations } from './LimitAnnotations/LimitAnnotations';
import { doSpcCalcs } from 'data/doSpcCalcs';
import buildLimitAnnotations from './LimitAnnotations/buildLimitAnnotations';
import { ChartPanelProps } from 'panelcfg';
import { BellCurve } from './BellCurve/BellCurve';

export const SpcHistogramPanel = ({ data, options, width, height }: ChartPanelProps) => {
  const theme = useTheme2();
  const { samples, limitAnnotations } = useMemo(() => {
    const samplesWithCalcs = doSpcCalcs(data.series, options);
    const limitAnnotationsResult = buildLimitAnnotations(data.series, options);
    return { samples: samplesWithCalcs, limitAnnotations: limitAnnotationsResult };
  }, [data.series, options]);

  const stampedSamples = useMemo(() => {
    return samples.map((frame, frameIndex) => ({
      ...frame,
      fields: frame.fields.map((field, fieldIndex) => ({
        ...field,
        state: {
          ...field.state,
          origin: { frameIndex, fieldIndex },
        },
      })),
    }));
  }, [samples]);

  const histogram = useMemo(() => {
    if (!stampedSamples.length) {
      return undefined;
    }

    if (stampedSamples.length === 1) {
      const info = getHistogramFields(stampedSamples[0]);
      if (info) {
        return histogramFieldsToFrame(info);
      }
    }
    const hist = buildHistogram(stampedSamples, options);
    if (!hist) {
      return undefined;
    }

    return histogramFieldsToFrame(hist, theme);
  }, [stampedSamples, options, theme]);

  const bucketSize = useMemo(() => {
    return histogram ? getBucketSize(histogram) : 0;
  }, [histogram]);

  const annotationsRange = useMemo(() => {
    if (limitAnnotations.limits.length === 0) {
      return undefined;
    }
    return { min: limitAnnotations.minPosition, max: limitAnnotations.maxPosition };
  }, [limitAnnotations.limits, limitAnnotations.minPosition, limitAnnotations.maxPosition]);

  const renderAnnotations = useCallback(
    (config: any, alignedFrame: any) => {
      return (
        <>
          {limitAnnotations.limits && <LimitAnnotations annotations={limitAnnotations.limits} config={config} />}
          {alignedFrame.length > 0 && <BellCurve config={config} data={alignedFrame} />}
        </>
      );
    },
    [limitAnnotations.limits]
  );

  if (!histogram || !histogram.fields.length) {
    return (
      <div className="panel-empty">
        <p>No histogram found in response</p>
      </div>
    );
  }

  return (
    <Histogram
      options={options}
      theme={theme}
      legend={options.legend}
      rawSeries={stampedSamples}
      structureRev={data.structureRev}
      width={width}
      height={height}
      alignedFrame={histogram}
      bucketSize={bucketSize}
      annotationsRange={annotationsRange}
    >
      {renderAnnotations}
    </Histogram>
  );
};
