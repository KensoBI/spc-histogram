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
    >
      {(config, alignedFrame) => {
        return <>{annotations && <AnnotationsPlugin annotations={annotations} config={config} />}</>;
      }}
    </Histogram>
  );
};
