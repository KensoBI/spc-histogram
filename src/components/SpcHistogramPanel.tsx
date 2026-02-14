import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { buildHistogram, FieldType, getHistogramFields } from '@grafana/data';
import { histogramFieldsToFrame } from '../data/transform';
import { ContextMenu, MenuItem, useSplitter, useTheme2 } from '@grafana/ui';
import { Histogram, getBucketSize } from './Histogram/Histogram';
import { LimitAnnotations } from './LimitAnnotations/LimitAnnotations';
import { doSpcCalcs } from 'data/doSpcCalcs';
import { ControlLineReducerId } from 'data/spcReducers';
import buildLimitAnnotations from './LimitAnnotations/buildLimitAnnotations';
import { ChartPanelProps } from 'panelcfg';
import { BellCurve } from './BellCurve/BellCurve';
import { HistogramTooltip } from './HistogramTooltip/HistogramTooltip';
import { createGaussianCurve } from './BellCurve/gaussian';
import { useSubgroupSizeOptions } from './options/useSubgroupSize';
import { StatisticsTable } from './StatisticsTable/StatisticsTable';
import { calculateSeriesStatistics } from './StatisticsTable/calculateCapabilityIndices';
import { buildExportCsv, resolveControlLines, downloadCsv, generateExportFilename } from 'utils/exportCsv';
import { CurveFit } from 'types';

export const SpcHistogramPanel = ({ data, options, width, height }: ChartPanelProps) => {
  const theme = useTheme2();
  const optionsWithVars = useSubgroupSizeOptions(options).options;

  const allSamplesWithCalcs = useMemo(() => {
    return doSpcCalcs(data.series, optionsWithVars);
  }, [data.series, optionsWithVars]);

  const samples = useMemo(() => {
    if (optionsWithVars.featureQueryRefIds) {
      return allSamplesWithCalcs.filter((frame) => !optionsWithVars.featureQueryRefIds.includes(frame.refId!));
    }
    return allSamplesWithCalcs;
  }, [allSamplesWithCalcs, optionsWithVars.featureQueryRefIds]);

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

  // Compute Gaussian fitted params and store µ in calcs for gaussianPeak control lines
  const allSamplesWithGaussianCalcs = useMemo(() => {
    const hasGaussianPeakLine = optionsWithVars.controlLines?.some(
      (cl) => cl.reducerId === ControlLineReducerId.gaussianPeak
    );

    if (!hasGaussianPeakLine || !histogram || !optionsWithVars.curves) {
      return allSamplesWithCalcs;
    }

    const gaussianCurves = optionsWithVars.curves.filter((c) => c.fit === CurveFit.gaussian);
    if (gaussianCurves.length === 0) {
      return allSamplesWithCalcs;
    }

    // Compute fitted µ for each Gaussian curve's series
    const fittedMeans = new Map<number, number>();
    gaussianCurves.forEach((curve) => {
      try {
        const result = createGaussianCurve(histogram, stampedSamples, curve.seriesIndex);
        if (result.params.mean) {
          fittedMeans.set(curve.seriesIndex, result.params.mean);
        }
      } catch {
        // Gaussian fitting may fail for insufficient data
      }
    });

    if (fittedMeans.size === 0) {
      return allSamplesWithCalcs;
    }

    // Write fitted µ into field.state.calcs.gaussianPeak
    return allSamplesWithCalcs.map((frame, frameIndex) => {
      const fittedMean = fittedMeans.get(frameIndex);
      if (fittedMean === undefined) {
        return frame;
      }

      return {
        ...frame,
        fields: frame.fields.map((field) => {
          if (field.type !== FieldType.number || !field.state?.calcs) {
            return field;
          }
          return {
            ...field,
            state: {
              ...field.state,
              calcs: {
                ...field.state.calcs,
                [ControlLineReducerId.gaussianPeak]: fittedMean,
              },
            },
          };
        }),
      };
    });
  }, [allSamplesWithCalcs, histogram, stampedSamples, optionsWithVars.controlLines, optionsWithVars.curves]);

  const limitAnnotations = useMemo(() => {
    return buildLimitAnnotations(allSamplesWithGaussianCalcs, optionsWithVars);
  }, [allSamplesWithGaussianCalcs, optionsWithVars]);

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
          <HistogramTooltip
            config={config}
            histogramFrame={alignedFrame}
            annotations={limitAnnotations.limits}
            curveOptions={optionsWithVars.curves}
            rawSeries={stampedSamples}
          />
        </>
      );
    },
    [limitAnnotations.limits, optionsWithVars.curves, stampedSamples]
  );

  const handleExport = useCallback(() => {
    const statistics = calculateSeriesStatistics(samples, optionsWithVars);
    const controlLines = resolveControlLines(allSamplesWithGaussianCalcs, optionsWithVars);
    const csv = buildExportCsv(statistics, controlLines, histogram, optionsWithVars.statisticsTableColumns);
    downloadCsv(csv, generateExportFilename());
  }, [samples, optionsWithVars, allSamplesWithGaussianCalcs, histogram]);

  const showTable = optionsWithVars.showStatisticsTable !== false;

  const [histogramHeight, setHistogramHeight] = useState(Math.round(height * 0.75));

  const { containerProps, primaryProps, secondaryProps, splitterProps } = useSplitter({
    direction: 'column',
    initialSize: 0.75,
  });

  // Track the actual pixel height of the primary pane via ResizeObserver
  // so the histogram size is correct on initial render (not just after drag).
  useEffect(() => {
    const el = primaryProps.ref.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setHistogramHeight(Math.round(entry.contentRect.height));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [primaryProps.ref]);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    []
  );

  if (!histogram || !histogram.fields.length) {
    return (
      <div className="panel-empty">
        <p>No histogram found in response</p>
      </div>
    );
  }

  if (!showTable) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height }} onContextMenu={handleContextMenu}>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            renderMenuItems={() => (
              <MenuItem label="Download CSV" icon="download-alt" onClick={handleExport} />
            )}
          />
        )}
        <Histogram
          options={optionsWithVars}
          theme={theme}
          legend={optionsWithVars.legend}
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
      </div>
    );
  }

  return (
    <div
      {...containerProps}
      style={{ height, width }}
      onContextMenu={handleContextMenu}
    >
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          renderMenuItems={() => (
            <MenuItem label="Download CSV" icon="download-alt" onClick={handleExport} />
          )}
        />
      )}
      <div {...primaryProps} style={{ ...primaryProps.style, overflow: 'hidden', minHeight: 0 }}>
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
      </div>
      <div {...splitterProps} />
      <div {...secondaryProps} style={{ ...secondaryProps.style, overflow: 'auto', display: 'flex', justifyContent: 'center', minHeight: 0 }}>
        <StatisticsTable
          series={samples}
          options={optionsWithVars}
          theme={theme}
          onExport={handleExport}
        />
      </div>
    </div>
  );
};
