import { PanelPlugin, FieldConfigProperty, FieldColorModeId } from '@grafana/data';
import { commonOptionsBuilder, graphFieldOptions } from '@grafana/ui';
import { FieldConfig, Options, defaultOptions } from 'components/Histogram/panelcfg';
import { SpcHistogramPanel } from 'components/SpcHistogramPanel';
import { AggregationTypeEditor } from 'components/options/AggregationTypeEditor';
import { ControlLineEditor } from 'components/options/ControlLineEditor';
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

    builder.addSelect({
      path: 'subgroupSize',
      name: 'Subgroup size',
      description: 'The number of measurements taken within a single subgroup. Allows for custom input.',
      settings: {
        allowCustomValue: true,
        options: [
          { value: 1, label: '1' },
          { value: 2, label: '2' },
          { value: 3, label: '3' },
          { value: 4, label: '4' },
          { value: 5, label: '5' },
          { value: 6, label: '6' },
          { value: 7, label: '7' },
          { value: 8, label: '8' },
          { value: 9, label: '9' },
          { value: 10, label: '10' },
          { value: 12, label: '11' },
          { value: 12, label: '12' },
          { value: 13, label: '13' },
          { value: 14, label: '14' },
          { value: 15, label: '15' },
          { value: 16, label: '16' },
          { value: 17, label: '17' },
          { value: 18, label: '18' },
          { value: 19, label: '19' },
          { value: 20, label: '20' },
          { value: 21, label: '21' },
          { value: 22, label: '22' },
          { value: 23, label: '23' },
          { value: 24, label: '24' },
          { value: 25, label: '25' },
        ],
      },
      defaultValue: 1,
      category: ['SPC'],
    });
    // builder.addSelect({
    //   path: 'aggregationType',
    //   name: 'Aggregation type',
    //   description: 'Define how each subgroup is calculated.',
    //   settings: {
    //     allowCustomValue: false,
    //     options: aggregationOptions.map<SelectableValue<string>>((i) => ({ label: i.name, value: i.id })),
    //   },
    //   // settings: {
    //   //   allowCustomValue: false,
    //   //   options: aggregationOptions.filter((aggregation) => aggregation.subgroupSize >= option.subgroupSize)

    //   //     .map<SelectableValue<string>>((i) => ({ label: i.name, value: i.id}))

    //   // },
    //   defaultValue: 'mean',
    //   //showIf: (option) => option.subgroupSize > 1,
    //   category: ['SPC'],
    // });

    builder.addCustomEditor({
      id: 'aggregationType',
      path: 'aggregationType',
      name: 'Aggregation type',
      description: 'Define how each subgroup is calculated.',
      editor: AggregationTypeEditor,
      defaultValue: 'none',
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
