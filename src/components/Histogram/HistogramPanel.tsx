import React, { useMemo } from 'react';

import { DataFrame, buildHistogram, getHistogramFields } from '@grafana/data';
import { histogramFieldsToFrame } from './transform';
import { useTheme2 } from '@grafana/ui';

import { Histogram, getBucketSize } from './Histogram';
import { Options } from './panelcfg';
import { AnnotationEntity, AnnotationsPlugin } from 'components/SpcChart/AnnotationPlugin';

type Props = {
  options: Options;
  width: number;
  height: number;
  series: DataFrame[];
  annotations?: AnnotationEntity[];
};

export const HistogramPanel = ({ series, options, width, height, annotations }: Props) => {
  const theme = useTheme2();

  const histogram = useMemo(() => {
    if (!series.length) {
      return undefined;
    }

    // stamp origins for legend's calcs (from raw values)
    series.forEach((frame, frameIndex) => {
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

    if (series.length === 1) {
      const info = getHistogramFields(series[0]);
      if (info) {
        return histogramFieldsToFrame(info);
      }
    }
    const hist = buildHistogram(series, options);
    if (!hist) {
      return undefined;
    }

    return histogramFieldsToFrame(hist, theme);
  }, [series, options, theme]);

  const annotationsRange = useMemo(() => {
    if (annotations == null || annotations.length === 0) {
      return undefined;
    }

    const values: number[] = [];
    for (const an of annotations) {
      if (an.type === 'flag') {
        values.push(an.time);
      } else {
        if (an.timeStart) {
          values.push(an.timeStart);
        }
        if (an.timeEnd) {
          values.push(an.timeEnd);
        }
      }
    }

    return {
      max: values.reduce((max, item) => Math.max(max, item), values?.[0]),
      min: values.reduce((min, item) => Math.min(min, item), values?.[0]),
    };
  }, [annotations]);

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
      rawSeries={series}
      structureRev={0} //TODO - what is this used for?
      width={width}
      height={height}
      alignedFrame={histogram}
      bucketSize={bucketSize}
      annotationsRange={annotationsRange}
    >
      {(config, alignedFrame) => {
        return <>{annotations && <AnnotationsPlugin annotations={annotations} config={config} />}</>;
      }}
    </Histogram>
  );
};
