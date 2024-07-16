import { DataFrame } from '@grafana/data';
import { ConstantAnnotation, Flag, Region } from 'components/Histogram/AnnotationPlugin';
import { Options } from 'components/Histogram/panelcfg';
import addCalcsToControlLines from './useControlLineBuilder';

export default function useConstantAnnotation(series: DataFrame[], options: Options): ConstantAnnotation[] {
  const controlLines = addCalcsToControlLines(series, options);
  if (!controlLines.length) {
    return [];
  }

  const annotations: ConstantAnnotation[] = [];

  // Sort controlLines by position
  controlLines.sort((a, b) => a.position - b.position);

  controlLines.forEach((cl, index) => {
    const flag: Flag = {
      type: 'flag',
      time: cl.position,
      title: cl.name,
      color: cl.lineColor,
      lineWidth: cl.lineWidth,
    };
    annotations.push(flag);

    const nextControlLine = controlLines[index + 1];

    if (cl.fillDirection === -1) {
      const prevControlLine = controlLines[index - 1];
      // Add region from the left
      const regionLeft: Region = {
        type: 'region',
        timeEnd: cl.position,
        timeStart: prevControlLine ? prevControlLine.position : undefined,
        title: cl.name,
        color: cl.lineColor,
        lineWidth: cl.lineWidth,
        fillOpacity: cl.fillOpacity,
      };
      annotations.push(regionLeft);
    } else if (cl.fillDirection === 1) {
      // Add region from the right
      const regionRight: Region = {
        type: 'region',
        timeStart: cl.position,
        timeEnd: nextControlLine ? nextControlLine.position : undefined,
        title: cl.name,
        color: cl.lineColor,
        lineWidth: cl.lineWidth,
        fillOpacity: cl.fillOpacity,
      };
      annotations.push(regionRight);
    }
  });

  return annotations;
}
