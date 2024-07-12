import React, { useMemo } from 'react';
import { buildHistogram, getHistogramFields } from '@grafana/data';
import { histogramFieldsToFrame } from '../data/transform';
import { useTheme2 } from '@grafana/ui';
import { Histogram, getBucketSize } from './Histogram/Histogram';
import { ChartPanelProps } from 'types';
import { useParseOptions } from '../hooks/useParseOptions';

import { sampleParser } from 'data/sampleParsers';
import addCalcsToControlLines from 'hooks/useControlLineBuilder';

export const SpcHistogramPanel = ({ data, options, width, height }: ChartPanelProps) => {
  const theme = useTheme2();
  const { value: spcOptions } = useParseOptions(options);
  const samples = sampleParser(data.series, options);
  const controlLines = addCalcsToControlLines(data.series, options);
  //const annotations = useConstantAnnotation(samples, spcOptions);

  const histogram = useMemo(() => {
    if (!samples.length) {
      return undefined;
    }

    // stamp origins for legend's calcs (from raw values)
    samples.forEach((frame, frameIndex) => {
      frame.fields.forEach((field, fieldIndex) => {
        field.state = {
          ...field.state,
          origin: {
            frameIndex,
            fieldIndex,
          },
        };
      });
    });

    if (samples.length === 1) {
      const info = getHistogramFields(samples[0]);
      if (info) {
        return histogramFieldsToFrame(info);
      }
    }
    const hist = buildHistogram(samples, spcOptions);
    if (!hist) {
      return undefined;
    }

    return histogramFieldsToFrame(hist, theme);
  }, [samples, spcOptions, theme]);

  // const annotationsRange = useMemo(() => {
  //   if (annotations == null || annotations.length === 0) {
  //     return undefined;
  //   }

  //   const values: number[] = [];
  //   for (const an of annotations) {
  //     if (an.type === 'flag') {
  //       values.push(an.time);
  //     } else {
  //       if (an.timeStart) {
  //         values.push(an.timeStart);
  //       }
  //       if (an.timeEnd) {
  //         values.push(an.timeEnd);
  //       }
  //     }
  //   }

  //   return {
  //     max: values.reduce((max, item) => Math.max(max, item), values?.[0]),
  //     min: values.reduce((min, item) => Math.min(min, item), values?.[0]),
  //   };
  // }, [annotations]);

  if (!histogram || !histogram.fields.length) {
    return (
      <div className="panel-empty">
        <p>No histogram found in response</p>
      </div>
    );
  }

  const bucketSize = getBucketSize(histogram);

  return (
    <Histogram
      options={options}
      theme={theme}
      legend={options.legend}
      rawSeries={samples}
      structureRev={data.structureRev}
      width={width}
      height={height}
      alignedFrame={histogram}
      bucketSize={bucketSize}
      //annotationsRange={annotationsRange}
    >
      {/* {(config, alignedFrame) => {
        return <>{annotations && <AnnotationsPlugin annotations={annotations} config={config} />}</>;
      }} */}
    </Histogram>
  );
};
