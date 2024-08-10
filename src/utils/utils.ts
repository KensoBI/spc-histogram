import { AlignedData } from 'uplot';
import { DataFrame, ensureTimeField, FieldType } from '@grafana/data';

import { BarAlignment, GraphDrawStyle, GraphTransform, LineInterpolation, StackingMode } from '@grafana/schema';
import { buildScaleKey } from '@grafana/ui';

export interface StackingGroup {
  series: number[];
  dir: number;
}

/** @internal */
const enum StackDirection {
  Pos = 1,
  Neg = -1,
}

interface StackMeta {
  totals: AlignedData;
}

function getStackDirection(transform: GraphTransform, data: unknown[]) {
  const hasNegSamp = hasNegSample(data);

  if (transform === GraphTransform.NegativeY) {
    return hasNegSamp ? StackDirection.Pos : StackDirection.Neg;
  }
  return hasNegSamp ? StackDirection.Neg : StackDirection.Pos;
}

// similar to isLikelyAscendingVector()
function hasNegSample(data: unknown[], samples = 100) {
  const len = data.length;

  if (len === 0) {
    return false;
  }

  // skip leading & trailing nullish
  let firstIdx = 0;
  let lastIdx = len - 1;

  while (firstIdx <= lastIdx && data[firstIdx] == null) {
    firstIdx++;
  }

  while (lastIdx >= firstIdx && data[lastIdx] == null) {
    lastIdx--;
  }

  let negCount = 0;
  let posCount = 0;

  if (lastIdx >= firstIdx) {
    const stride = Math.max(1, Math.floor((lastIdx - firstIdx + 1) / samples));

    for (let i = firstIdx; i <= lastIdx; i += stride) {
      const v = data[i];

      if (v != null && typeof v === 'number') {
        if (v < 0 || Object.is(v, -0)) {
          negCount++;
        } else if (v > 0) {
          posCount++;
        }
      }
    }

    if (negCount > posCount) {
      return true;
    }
  }

  return false;
}

export function getStackingGroups(frame: DataFrame) {
  let groups: Map<string, StackingGroup> = new Map();

  frame.fields.forEach(({ config, values, type }, i) => {
    // skip x or time field
    if (i === 0) {
      return;
    }

    let { custom } = config;

    if (custom == null) {
      return;
    }

    // TODO: currently all AlignedFrame fields end up in uplot series & data, even custom.hideFrom?.viz
    // ideally hideFrom.viz fields would be excluded so we can remove this
    if (custom.hideFrom?.viz) {
      return;
    }

    let { stacking } = custom;

    if (stacking == null) {
      return;
    }

    let { mode: stackingMode, group: stackingGroup } = stacking;

    // not stacking
    if (stackingMode === StackingMode.None) {
      return;
    }

    // will this be stacked up or down after any transforms applied
    let transform = custom.transform;
    let stackDir = getStackDirection(transform, values);

    let drawStyle: GraphDrawStyle = custom.drawStyle;
    let drawStyle2: BarAlignment | LineInterpolation | null =
      drawStyle === GraphDrawStyle.Bars
        ? custom.barAlignment
        : drawStyle === GraphDrawStyle.Line
          ? custom.lineInterpolation
          : null;

    let stackKey = `${stackDir}|${stackingMode}|${stackingGroup}|${buildScaleKey(
      config,
      type
    )}|${drawStyle}|${drawStyle2}`;

    let group = groups.get(stackKey);

    if (group == null) {
      group = {
        series: [],
        dir: stackDir,
      };

      groups.set(stackKey, group);
    }

    group.series.push(i);
  });

  return [...groups.values()];
}

/** @internal */
export function preparePlotData2(
  frame: DataFrame,
  stackingGroups: StackingGroup[],
  onStackMeta?: (meta: StackMeta) => void
): AlignedData {
  let data = Array(frame.fields.length);

  let stacksQty = stackingGroups.length;

  let dataLen = frame.length;
  let zeroArr = stacksQty > 0 ? Array(dataLen).fill(0) : [];
  let falseArr = stacksQty > 0 ? Array(dataLen).fill(false) : [];
  let accums = Array.from({ length: stacksQty }, () => zeroArr.slice());

  let anyValsAtX = Array.from({ length: stacksQty }, () => falseArr.slice());

  // figure out at which time indices each stacking group has any values
  // (needed to avoid absorbing initial accum 0s at unrelated joined timestamps)
  stackingGroups.forEach((group, groupIdx) => {
    let groupValsAtX = anyValsAtX[groupIdx];

    group.series.forEach((seriesIdx) => {
      let field = frame.fields[seriesIdx];

      if (field.config.custom?.hideFrom?.viz) {
        return;
      }

      let vals = field.values;

      for (let i = 0; i < dataLen; i++) {
        if (vals[i] != null) {
          groupValsAtX[i] = true;
        }
      }
    });
  });

  frame.fields.forEach((field, i) => {
    let vals = field.values;

    if (i === 0) {
      if (field.type === FieldType.time) {
        data[0] = ensureTimeField(field).values;
      } else {
        data[0] = vals;
      }
      return;
    }

    let { custom } = field.config;

    if (!custom || custom.hideFrom?.viz) {
      data[i] = vals;
      return;
    }

    // apply transforms
    if (custom.transform === GraphTransform.Constant) {
      let firstValIdx = vals.findIndex((v) => v != null);
      let firstVal = vals[firstValIdx];
      vals = Array(vals.length).fill(undefined);
      vals[firstValIdx] = firstVal;
    } else {
      vals = vals.slice();

      if (custom.transform === GraphTransform.NegativeY) {
        for (let i = 0; i < vals.length; i++) {
          if (vals[i] != null) {
            vals[i] *= -1;
          }
        }
      }
    }

    let stackingMode = custom.stacking?.mode;

    if (!stackingMode || stackingMode === StackingMode.None) {
      data[i] = vals;
    } else {
      let stackIdx = stackingGroups.findIndex((group) => group.series.indexOf(i) > -1);

      let accum = accums[stackIdx];
      let groupValsAtX = anyValsAtX[stackIdx];
      let stacked = (data[i] = Array(dataLen));

      for (let i = 0; i < dataLen; i++) {
        let v = vals[i];

        if (v != null) {
          stacked[i] = accum[i] += v;
        } else {
          stacked[i] = groupValsAtX[i] ? accum[i] : v;
        }
      }
    }
  });

  if (onStackMeta) {
    let accumsBySeriesIdx = data.map((vals, i) => {
      let stackIdx = stackingGroups.findIndex((group) => group.series.indexOf(i) > -1);
      return stackIdx !== -1 ? accums[stackIdx] : vals;
    });

    onStackMeta({
      totals: accumsBySeriesIdx,
    });
  }

  // re-compute by percent
  frame.fields.forEach((field, i) => {
    if (i === 0 || field.config.custom?.hideFrom?.viz) {
      return;
    }

    let stackingMode = field.config.custom?.stacking?.mode;

    if (stackingMode === StackingMode.Percent) {
      let stackIdx = stackingGroups.findIndex((group) => group.series.indexOf(i) > -1);
      let accum = accums[stackIdx];
      let group = stackingGroups[stackIdx];

      let stacked = data[i];

      for (let i = 0; i < dataLen; i++) {
        let v = stacked[i];

        if (v != null) {
          // v / accum will always be pos, so properly (re)sign by group stacking dir
          stacked[i] = accum[i] === 0 ? 0 : group.dir * (v / accum[i]);
        }
      }
    }
  });

  return data;
}
