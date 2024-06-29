import { PanelPlugin, FieldConfigProperty, FieldColorModeId } from '@grafana/data';
import { commonOptionsBuilder, graphFieldOptions } from '@grafana/ui';
import { ChartPanel } from './components/ChartPanel';
import { ConstantsListEditor } from 'components/options/ConstantsListEditor';
import { SpcOptionEditor } from 'components/options/SpcOptionEditor';
import { parseData } from 'data/parseData';
import { FieldConfig, Options, defaultOptions } from 'components/Histogram/panelcfg';

export const plugin = new PanelPlugin<Options, FieldConfig>(ChartPanel)

  .setPanelOptions((builder) => {
    builder
      .addNumberInput({
        path: 'bucketCount',
        name: 'Bucket count',
        description: 'approximate bucket count',
        settings: {
          placeholder: `Default: ${defaultOptions.bucketCount}`,
          min: 0,
        },
        category: ['Histogram'],
        //showIf: (opts, data) => !originalDataHasHistogram(data),
      })
      .addNumberInput({
        path: 'bucketSize',
        name: 'Bucket size',
        settings: {
          placeholder: 'Auto',
          min: 0,
        },
        defaultValue: defaultOptions.bucketSize,
        category: ['Histogram'],
      })
      .addNumberInput({
        path: 'bucketOffset',
        name: 'Bucket offset',
        description: 'for non-zero-based buckets',
        settings: {
          placeholder: `Default: ${defaultOptions.bucketOffset}`,
          min: 0,
        },
        category: ['Histogram'],
      })
      .addBooleanSwitch({
        path: 'combine',
        name: 'Combine series',
        description: 'combine all series into a single histogram',
        defaultValue: defaultOptions.combine,
        category: ['Histogram'],
      });

    builder.addCustomEditor({
      id: 'spcOptions',
      path: 'spc',
      name: 'SPC options',
      description: 'Select options for SPC chart. You can enter a custom sample size value by typing a number.',
      defaultValue: defaultOptions.spc,
      editor: SpcOptionEditor,
      category: ['SPC'],
      showIf: (_, data) => parseData(data ?? []).hasTableData === false,
    });
    builder.addCustomEditor({
      id: 'constants',
      path: 'constants',
      name: 'Constants',
      description: 'Add constants for the chart',
      defaultValue: defaultOptions.constants,
      editor: ConstantsListEditor,
      category: ['SPC'],
    });
    // builder.addCustomEditor({
    //   id: 'limitOptions',
    //   path: 'limits',
    //   name: 'Limits',
    //   description: 'Upper and lower limits for the chart',
    //   defaultValue: defaultOptions.limits,
    //   editor: LimitsEditor,
    //   category: ['SPC'],
    // });

    commonOptionsBuilder.addLegendOptions(builder);

    return builder;
  })
  .useFieldConfig({
    disableStandardOptions: [FieldConfigProperty.Thresholds, FieldConfigProperty.Mappings, FieldConfigProperty.Links],
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
          category: ['Histogram'],
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
          category: ['Histogram'],
        })
        .addRadio({
          path: 'gradientMode',
          name: 'Gradient mode',
          defaultValue: graphFieldOptions.fillGradient[0].value,
          settings: {
            options: graphFieldOptions.fillGradient,
          },
          category: ['Histogram'],
        });

      commonOptionsBuilder.addHideFrom(builder);
    },
  });
