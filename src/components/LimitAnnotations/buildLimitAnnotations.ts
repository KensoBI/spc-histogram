import { DataFrame, FieldType } from '@grafana/data';
import { ControlLine, Options } from 'panelcfg';
import { controlLineReducers } from 'data/spcReducers';
import { Flag, LimitAnnotation, LimitAnnotationConfig, Region } from './LimitAnnotations';
import { PositionInput } from 'types';

export default function buildLimitAnnotations(series: DataFrame[], options: Options): LimitAnnotationConfig {
  const computedControlLines = addComputedControlLines(series, options);
  const nonComputedControlLines = addNonComputedControlLines(series, options);

  const controlLines = computedControlLines.concat(nonComputedControlLines).filter((p) => p.position);

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
  controlLines.sort((a, b) => a.position! - b.position!);

  controlLines.forEach((cl, index) => {
    minPosition = Math.min(minPosition, cl.position!);
    maxPosition = Math.max(maxPosition, cl.position!);

    if (!allIndexes.includes(cl.seriesIndex)) {
      return;
    }

    const flag: Flag = {
      type: 'flag',
      time: cl.position!,
      title: cl.name,
      color: cl.lineColor,
      lineWidth: cl.lineWidth,
    };
    limits.push(flag);

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

function addComputedControlLines(series: DataFrame[], options: Options): ControlLine[] {
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
    return [];
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
        //no calcs cached, nothing to assign
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

  return computedControlLines;
}

function addNonComputedControlLines(series: DataFrame[], options: Options): ControlLine[] {
  if (!options.controlLines || options.controlLines.length === 0) {
    return [];
  }

  // copy control lines to avoid mutating the original control line options.
  const controlLines = options.controlLines.map((cl) => ({ ...cl }));

  // grab id's of all non-computed reducers
  const nonComputedReducers = controlLineReducers.filter((p) => !p.computed).map((p) => p.id);

  // filter non-computed control lines
  const nonComputedControlLines = controlLines.filter((cl) => nonComputedReducers.includes(cl.reducerId));

  if (nonComputedControlLines.length === 0) {
    return [];
  }

  series.map((frame, frameIndex) => {
    const seriesControlLines = nonComputedControlLines.filter((c) => c.seriesIndex === frameIndex);
    if (seriesControlLines.length === 0) {
      return;
    }

    seriesControlLines.forEach((cl) => {
      if (cl.positionInput === PositionInput.series) {
        const field = frame.fields.find((f) => f.name === cl.field);

        if (field && field.values.length > 0) {
          const lastValue = field.values[field.values.length - 1];

          if (typeof lastValue === 'number') {
            cl.position = lastValue;
          }
        }
      }
    });
  });

  return nonComputedControlLines;
}
