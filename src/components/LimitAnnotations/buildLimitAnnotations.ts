import { DataFrame, FieldType } from '@grafana/data';
import { ControlLine, Options } from 'panelcfg';
import { controlLineReducers } from 'data/spcReducers';
import { Flag, LimitAnnotation, LimitAnnotationConfig, Region } from './LimitAnnotations';

export default function buildLimitAnnotations(series: DataFrame[], options: Options): LimitAnnotationConfig {
  const controlLines = addCalcsToControlLines(series, options);
  if (!controlLines.length) {
    return {
      minPosition: 0,
      maxPosition: 0,
      limits: [],
    };
  }

  const allIndexes = series.map((_, index) => index);
  const limits: LimitAnnotation[] = [];
  let minPosition = Infinity;
  let maxPosition = -Infinity;

  // Sort controlLines by position
  controlLines.sort((a, b) => a.position - b.position);

  controlLines.forEach((cl, index) => {
    minPosition = Math.min(minPosition, cl.position);
    maxPosition = Math.max(maxPosition, cl.position);

    if (!allIndexes.includes(cl.seriesIndex)) {
      return;
    }

    const flag: Flag = {
      type: 'flag',
      time: cl.position,
      title: cl.name,
      color: cl.lineColor,
      lineWidth: cl.lineWidth,
    };
    limits.push(flag);

    const nextControlLine = controlLines[index + 1];

    if (cl.fillDirection === -1 && cl.position > 0) {
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
      limits.push(regionLeft);
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
      limits.push(regionRight);
    }
  });

  return {
    minPosition,
    maxPosition,
    limits,
  };
}

function addCalcsToControlLines(series: DataFrame[], options: Options): ControlLine[] {
  if (!options.controlLines || options.controlLines.length === 0) {
    return [];
  }

  // copy control lines to avoid mutating the original control line options.
  const controlLines = options.controlLines.map((cl) => ({ ...cl }));

  // grab id's of all computed reducers
  const computedReducers = controlLineReducers.filter((p) => p.computed).map((p) => p.id);

  // short circuite looping series if there are no computed control lines is provided options.
  const computedControlLines = controlLines.filter((cl) => computedReducers.includes(cl.reducerId));
  if (computedControlLines.length === 0) {
    //return all control lines
    return controlLines;
  }

  series.map((frame, frameIndex) => {
    const seriesControlLines = controlLines.filter((c) => c.seriesIndex === frameIndex);
    if (seriesControlLines.length === 0) {
      return;
    }

    const numericFrames = frame.fields.filter((field) => field.type === FieldType.number && field.state?.calcs);
    if (numericFrames.length > 0) {
      //take first numeric frame
      const calcs = numericFrames[0].state?.calcs;
      if (!calcs) {
        //no calcs cached, noting to assign
        return;
      }

      seriesControlLines.forEach((cl) => {
        // if this control line was computed, grab computed vaule from calcs
        // this check should never be false but just to be sure we dont ever overwrite existing static position value provided by user
        if (computedReducers.includes(cl.reducerId)) {
          cl.position = calcs[cl.reducerId];
        }
      });
    }
  });

  return controlLines;
}
