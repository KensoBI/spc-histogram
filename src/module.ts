import { PanelPlugin, FieldConfigProperty, FieldColorModeId } from '@grafana/data';
import { commonOptionsBuilder, graphFieldOptions } from '@grafana/ui';
import { ChartPanel } from './components/ChartPanel';
import { LimitsEditor } from './components/options/LimitsEditor';
import { ConstantsListEditor } from 'components/options/ConstantsListEditor';
import { SimpleParamsEditor } from 'components/options/SimpleParamsEditor';
import { SpcOptionEditor } from 'components/options/SpcOptionEditor';
import { parseData } from 'data/parseData';
import { FieldConfig, Options, defaultOptions } from 'components/Histogram/panelcfg';

export const plugin = new PanelPlugin<Options, FieldConfig>(ChartPanel)

  .useFieldConfig({
    disableStandardOptions: [
      FieldConfigProperty.Unit,
      FieldConfigProperty.NoValue,
      FieldConfigProperty.Thresholds,
      FieldConfigProperty.Mappings,
      FieldConfigProperty.Links,
      FieldConfigProperty.Color,
      FieldConfigProperty.Filterable,
    ],
    standardOptions: {
      [FieldConfigProperty.Color]: {
        settings: {
          byValueSupport: false,
          bySeriesSupport: true,
          preferThresholdsMode: false,
        },
        defaultValue: {
          mode: FieldColorModeId.PaletteClassic,
        },
      },
    },
    useCustomConfig: (builder) => {
      const cfg: FieldConfig = {};

      builder
        // .addCustomEditor({
        //   id: 'stacking',
        //   path: 'stacking',
        //   name: 'Stacking',
        //   category: ['Histogram'],
        //   defaultValue: defaultHistogramConfig.stacking,
        //   editor: StackingEditor,
        //   override: StackingEditor,
        //   settings: {
        //     options: graphFieldOptions.stacking,
        //   },
        //   process: identityOverrideProcessor,
        //   shouldApply: (f) => f.type === FieldType.number,
        //   showIf: (opts, data) => !originalDataHasHistogram(data),
        // })
        .addSliderInput({
          path: 'lineWidth',
          name: 'Line width',
          defaultValue: cfg.lineWidth,
          settings: {
            min: 0,
            max: 10,
            step: 1,
          },
        })
        .addSliderInput({
          path: 'fillOpacity',
          name: 'Fill opacity',
          defaultValue: cfg.fillOpacity,
          settings: {
            min: 0,
            max: 100,
            step: 1,
          },
        })
        .addRadio({
          path: 'gradientMode',
          name: 'Gradient mode',
          defaultValue: graphFieldOptions.fillGradient[0].value,
          settings: {
            options: graphFieldOptions.fillGradient,
          },
        });

      commonOptionsBuilder.addHideFrom(builder);
    },
  })
  .setPanelOptions((builder) => {
    builder.addCustomEditor({
      id: 'spcOptions',
      path: 'spcOptions',
      name: 'SPC options',
      description: 'Select options for SPC chart. You can enter a custom sample size value by typing a number.',
      defaultValue: defaultOptions.spc,
      editor: SpcOptionEditor,
      category: ['Chart'],
      showIf: (_, data) => parseData(data ?? []).hasTableData === false,
    });
    builder.addCustomEditor({
      id: 'constantsConfig',
      path: 'constantsConfig',
      name: 'Constants',
      description: 'Add constants for the chart',
      defaultValue: defaultOptions.constants,
      editor: ConstantsListEditor,
      category: ['Chart'],
    });
    builder.addCustomEditor({
      id: 'limitOptions',
      path: 'limits',
      name: 'Limits',
      description: 'Upper and lower limits for the chart',
      defaultValue: defaultOptions.limits,
      editor: LimitsEditor,
      category: ['Chart'],
    });
    builder.addCustomEditor({
      id: 'timeseriesOptions',
      path: 'timeseries',
      name: 'Options',
      description: 'Timeseries settings',
      defaultValue: defaultOptions.timeseries,
      editor: SimpleParamsEditor,
      category: ['Chart'],
    });

    return builder;
  });
