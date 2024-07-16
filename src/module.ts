import { PanelPlugin, FieldConfigProperty, FieldColorModeId } from '@grafana/data';
import { commonOptionsBuilder, graphFieldOptions } from '@grafana/ui';
import { FieldConfig, Options, defaultOptions } from 'panelcfg';
import { SpcHistogramPanel } from 'components/SpcHistogramPanel';
import { AggregationTypeEditor } from 'components/options/AggregationTypeEditor';
import { ControlLineEditor } from 'components/options/ControlLineEditor';
import { SubgroupEditor } from 'components/options/SubgroupEditor';
import { SpcChartTyp } from 'types';

export const plugin = new PanelPlugin<Options, FieldConfig>(SpcHistogramPanel)

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

    builder.addSelect({
      path: 'chartType',
      name: 'Chart type',
      description: 'Choose the type of control chart to generate',
      settings: {
        allowCustomValue: false,
        options: [
          { label: 'none', value: SpcChartTyp.none },
          { label: 'X chart (XmR)', value: SpcChartTyp.x_XmR },
          { label: 'mR chart (XmR)', value: SpcChartTyp.mR_XmR },
          { label: 'X chart (Xbar-R)', value: SpcChartTyp.x_XbarR },
          { label: 'R chart (Xbar-R)', value: SpcChartTyp.r_XbarR },
          { label: 'X chart (Xbar-S)', value: SpcChartTyp.x_XbarS },
          { label: 'S chart (Xbar-S)', value: SpcChartTyp.s_XbarS },
        ],
      },

      defaultValue: SpcChartTyp.none,
      category: ['SPC'],
    });
    builder.addCustomEditor({
      id: 'subgroupSize',
      path: 'subgroupSize',
      name: 'Subgroup size',
      description: 'The number of measurements taken within a single subgroup.',
      editor: SubgroupEditor,
      defaultValue: 1,
      category: ['SPC'],
    });

    builder.addCustomEditor({
      id: 'aggregationType',
      path: 'aggregationType',
      name: 'Aggregation type',
      description: 'Define how each subgroup is calculated.',
      editor: AggregationTypeEditor,
      defaultValue: 'none',
      showIf: (option) => option.chartType === SpcChartTyp.none,
      category: ['SPC'],
    });

    builder.addCustomEditor({
      id: 'controlLines',
      path: 'controlLines',
      name: 'Control lines',
      description: 'A control line indicates thresholds for monitoring process stability.',
      editor: ControlLineEditor,
      defaultValue: [],
      category: ['SPC'],
    });

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
