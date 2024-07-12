import { DataFrame, FieldType } from '@grafana/data';
import { ControlLine, Options } from 'components/Histogram/panelcfg';
import { controlLineReducers } from 'data/spcReducers';

export default function addCalcsToControlLines(series: DataFrame[], options: Options): ControlLine[] {
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
