import { ConstantAnnotation } from 'components/Histogram/AnnotationPlugin';
import React from 'react';

//import { css } from '@emotion/css';
import { usePanelContext } from '@grafana/ui';
import { parseData } from 'data/parseData';
//import { PanelPropsProvider } from './PanelPropsProvider';
//import { TimeseriesSettings, defaultTimeseriesSettings } from './Histogram/types';
import { calcSpc } from 'data/calcSpc';

import { DataFrame } from '@grafana/data';
import { Options } from 'components/Histogram/panelcfg';

export default function useConstantAnnotation(series: DataFrame[], options: Options): ConstantAnnotation[] {
  const { features, hasTableData, hasCustomTableData } = React.useMemo(() => parseData(series), [series]);

  const [, selectedCharacteristic] = React.useMemo(() => {
    if (features.length === 0) {
      return [null, null];
    }
    let selectedFeature = features[0];
    if (!hasTableData) {
      selectedFeature = calcSpc(selectedFeature, options.spc, options.constants);
    }
    const keys = Object.keys(selectedFeature.characteristics);
    if (keys.length === 0) {
      return [null, null];
    }
    const selectedCharacteristic = selectedFeature.characteristics[keys[0]];
    return [selectedFeature, selectedCharacteristic];
  }, [features, hasTableData, options.constants, options.spc]);

  const context = usePanelContext();
  React.useEffect(() => {
    context.onInstanceStateChange?.({
      characteristicKeys: selectedCharacteristic?.table ? Object.keys(selectedCharacteristic.table) : null,
      hasTableData,
      hasCustomTableData,
    });
  }, [context, hasTableData, selectedCharacteristic, hasCustomTableData]);

  const annotations: ConstantAnnotation[] = [];
  const constantItemOptionsList = options.constants?.items;
  const table = selectedCharacteristic?.table;

  if (!constantItemOptionsList) {
    return annotations;
  }

  constantItemOptionsList.map((option) =>
    annotations.push({
      color: option.color,
      time: table ? table[option.name] : undefined,
      type: 'flag',
      title: option.title,
      lineWidth: option.lineWidth,
    })
  );

  return annotations;
}

// export default function useConstantAnnotation(
//   constantItemOptionsList?: ConstantItemOptions[],
//   table?: Characteristic['table']
// ): ConstantAnnotation[] {
//   //useMemo?
//   //const optionsWithDefaults = defaults(constantItemOptionsList, defaultConstantItem);

//   const annotations: ConstantAnnotation[] = [];

//   if (!constantItemOptionsList) {
//     return annotations;
//   }

//   constantItemOptionsList.map((option) =>
//     annotations.push({
//       color: option.color,
//       time: table ? table[option.name] : undefined,
//       type: 'flag',
//       title: option.title,
//       lineWidth: option.lineWidth,
//     })
//   );

//   return annotations;

//this is simple conversion from one object to another. We need to add region to UI and later calculate where each region should end.
//each constant should have left/right option to choose direction

//return {} as ConstantAnnotation[];

//   const constants = React.useMemo(() => {
//     return constantsConfig?.items
//       ?.map((config) => ({
//         title: config.title,
//         value: characteristic?.table?.[config.name],
//         color: config.color,
//         lineWidth: config.lineWidth,
//       }))
//       ?.filter((c) => c.value != null);
//   }, [characteristic?.table, constantsConfig]);

//   const annotations = React.useMemo(() => {
//     const ann: ConstantAnnotation[] = [];
//     for (const c of constants ?? []) {
//       if (!isNaN(c.value)) {
//         ann.push({
//           time: c.value,
//           type: 'flag',
//           title: c.title,
//           color: c.color,
//           lineWidth: c.lineWidth,
//         });
//       }
//     }
//     if (limits.up) {
//       ann.push({
//         timeStart: limits.up.value,
//         type: 'region',
//         title: 'Upper',
//         color: limits.up.color,
//       });
//     }
//     if (limits.down) {
//       ann.push({
//         timeEnd: limits.down.value,
//         type: 'region',
//         title: 'Upper',
//         color: limits.down.color,
//       });
//     }
//     return ann;
//   }, [constants, limits.down, limits.up]);
//}
