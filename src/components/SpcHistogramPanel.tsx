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
import { useSubgroupSizeOptions } from './options/useSubgroupSize';
import { StatisticsTable } from './StatisticsTable/StatisticsTable';

export const SpcHistogramPanel = ({ data, options, width, height }: ChartPanelProps) => {
  const theme = useTheme2();
  const optionsWithVars = useSubgroupSizeOptions(options).options;

  const { samples, limitAnnotations } = useMemo(() => {
    let samplesWithCalcs = doSpcCalcs(data.series, optionsWithVars);
    const limitAnnotationsResult = buildLimitAnnotations(samplesWithCalcs, optionsWithVars);

    if (optionsWithVars.featureQueryRefIds) {
      // Remove feature queries
      samplesWithCalcs = samplesWithCalcs.filter((frame) => !optionsWithVars.featureQueryRefIds.includes(frame.refId!));
    }

    return { samples: samplesWithCalcs, limitAnnotations: limitAnnotationsResult };
  }, [data.series, optionsWithVars]);

  const stampedSamples = useMemo(() => {
    return samples.map((frame, frameIndex) => ({
      ...frame,
      fields: frame.fields.map((field, fieldIndex) => ({
        ...field,
        state: {
          ...field.state,
          origin: { frameIndex, fieldIndex, refId: frame.refId },
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
    const hist = buildHistogram(stampedSamples, optionsWithVars);
    if (!hist) {
      return undefined;
    }

    return histogramFieldsToFrame(hist, theme);
  }, [stampedSamples, optionsWithVars, theme]);

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
          {alignedFrame.length > 0 && (
            <BellCurve
              config={config}
              histogramData={alignedFrame}
              rawSeries={stampedSamples}
              curveOptions={optionsWithVars.curves}
            />
          )}
        </>
      );
    },
    [limitAnnotations.limits, optionsWithVars.curves, stampedSamples]
  );

  if (!histogram || !histogram.fields.length) {
    return (
      <div className="panel-empty">
        <p>No histogram found in response</p>
      </div>
    );
  }

  const showTable = optionsWithVars.showStatisticsTable !== false;
  const tableHeight = showTable ? 100 : 0;
  const histogramHeight = height - tableHeight;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      <Histogram
        options={optionsWithVars}
        theme={theme}
        legend={optionsWithVars.legend}
        rawSeries={stampedSamples}
        structureRev={data.structureRev}
        width={width}
        height={histogramHeight}
        alignedFrame={histogram}
        bucketSize={bucketSize}
        annotationsRange={annotationsRange}
      >
        {renderAnnotations}
      </Histogram>
      {showTable && (
        <StatisticsTable
          series={samples}
          options={optionsWithVars}
          theme={theme}
        />
      )}
    </div>
  );
};
