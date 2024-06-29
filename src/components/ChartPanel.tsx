import React from 'react';
import { ChartPanelProps } from 'types';
//import { css } from '@emotion/css';
//import { PanelPropsProvider } from './PanelPropsProvider';
//import { TimeseriesSettings, defaultTimeseriesSettings } from './Histogram/types';
import { useParseOptions } from './options/parseOptions';
//import { HistogramComponent } from './Histogram/HistogramComponent';
//import { Field, FieldConfig, FieldType } from '@grafana/data';
import { HistogramPanel } from './Histogram/HistogramPanel';
import useConstantAnnotation from 'hooks/useConstantAnnotation';

export function ChartPanel(props: ChartPanelProps) {
  const { data, width, height } = props;
  //const styles = useStyles2(getStyles);
  const { value: options } = useParseOptions(props.options);
  const annotations = useConstantAnnotation(data.series, options);
  // const getValueFieldIndex = (fields: Field[]): number | null => {
  //   const index = fields.findIndex((field) => field.type === FieldType.number);
  //   return index !== -1 ? index : null;
  // };

  //const fields = data.series?.[0]?.fields;
  //const valueFieldIndex = fields ? getValueFieldIndex(fields) : null;
  // const fieldConfig: FieldConfig | undefined =
  //   fields && valueFieldIndex !== null ? fields[valueFieldIndex].config : undefined;

  // const { features, hasTableData, hasCustomTableData } = React.useMemo(() => parseData(data.series), [data.series]);

  // const [selectedFeature, selectedCharacteristic] = React.useMemo(() => {
  //   if (features.length === 0) {
  //     return [null, null];
  //   }
  //   let selectedFeature = features[0];
  //   if (!hasTableData) {
  //     selectedFeature = calcSpc(selectedFeature, options.spc, options.constants);
  //   }
  //   const keys = Object.keys(selectedFeature.characteristics);
  //   if (keys.length === 0) {
  //     return [null, null];
  //   }
  //   const selectedCharacteristic = selectedFeature.characteristics[keys[0]];
  //   return [selectedFeature, selectedCharacteristic];
  // }, [features, hasTableData, options.constants, options.spc]);

  // const context = usePanelContext();
  // const onInstanceStateChange = context.onInstanceStateChange;
  // React.useEffect(() => {
  //   onInstanceStateChange?.({
  //     characteristicKeys: selectedCharacteristic?.table ? Object.keys(selectedCharacteristic.table) : null,
  //     hasTableData,
  //     hasCustomTableData,
  //   });
  // }, [hasTableData, onInstanceStateChange, selectedCharacteristic, selectedFeature, hasCustomTableData]);

  // const annotations = useConstantAnnotation(props.options.constants?.items, selectedCharacteristic?.table);

  // const settings: TimeseriesSettings = React.useMemo(() => {
  //   const settings = { ...defaultTimeseriesSettings, ...options.timeseries, ...options.spc };
  //   settings.constantsConfig = {
  //     items: [],
  //   };
  //   if (options?.limits) {
  //     settings.limitConfig = options.limits;
  //     if (options.limits.up) {
  //       settings.constantsConfig.items.push({
  //         name: options.limits.up.name,
  //         title: options.limits.up.name,
  //         color: options.limits.up.color,
  //         lineWidth: 2,
  //       });
  //     }

  //     if (options.limits.down) {
  //       settings.constantsConfig.items.push({
  //         name: options.limits.down.name,
  //         title: options.limits.down.name,
  //         color: options.limits.down.color,
  //         lineWidth: 2,
  //       });
  //     }
  //   }
  //   if (options?.constants && options.constants.items.length > 0) {
  //     settings.constantsConfig.items.push(...options.constants.items);
  //   }
  //   return settings;
  // }, [options]);

  // const updatedProps = React.useMemo(
  //   () => ({
  //     ...props,
  //     options,
  //   }),
  //   [options, props]
  // );

  return (
    <HistogramPanel width={width} height={height} options={options} series={data.series} annotations={annotations} />

    // <PanelPropsProvider panelProps={updatedProps}>
    //   <div
    //     className={cx(
    //       styles.wrapper,
    //       css`
    //         width: ${width}px;
    //         height: ${height}px;
    //       `
    //     )}
    //   >
    //     {selectedFeature && selectedCharacteristic && (
    //       <HistogramComponent characteristic={selectedCharacteristic} settings={settings} fieldConfig={fieldConfig} />
    //     )}
    //   </div>
    // </PanelPropsProvider>
  );
}

// const getStyles = () => {
//   return {
//     wrapper: css`
//       font-family: Open Sans;
//       position: relative;
//     `,
//     svg: css`
//       position: absolute;
//       top: 0;
//       left: 0;
//     `,
//     textBox: css`
//       position: absolute;
//       bottom: 0;
//       left: 0;
//       padding: 10px;
//     `,
//   };
// };
