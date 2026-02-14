import { PanelPlugin, FieldConfigProperty, FieldColorModeId, SelectFieldConfigSettings } from '@grafana/data';
import { commonOptionsBuilder, graphFieldOptions, GraphGradientMode } from '@grafana/ui';
import { FieldConfig, Options, defaultOptions } from 'panelcfg';
import { SpcHistogramPanel } from 'components/SpcHistogramPanel';
import { AggregationTypeEditor } from 'components/options/AggregationTypeEditor';
import { ControlLineEditor } from 'components/options/ControlLineEditor';
import { SubgroupEditor } from 'components/options/SubgroupEditor';
import { SpcChartTyp } from 'types';
import { CurveEditor } from 'components/options/CurveEditor';
import { FeatureQueryEditor } from 'components/options/FeatureQueryEditor';

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

    builder.addCustomEditor({
      id: 'featureQueryRefIds',
      path: 'featureQueryRefIds',
      name: 'Feature Queries',
      description: 'Select the series that will act as a reference-only dataset, excluded from histogram computations.',
      editor: FeatureQueryEditor,
      defaultValue: null,
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

    builder.addCustomEditor({
      id: 'curves',
      path: 'curves',
      name: 'Add a Bell Curve',
      description: 'A bell curve represents a symmetrical, bell-shaped distribution centered around the mean.',
      editor: CurveEditor,
      defaultValue: [],
      category: ['Curve'],
    });

    builder.addBooleanSwitch({
      path: 'showStatisticsTable',
      name: 'Show statistics table',
      description: 'Display a table with SPC statistics below the histogram',
      defaultValue: true,
      category: ['Statistics Table'],
    });

    builder.addMultiSelect<string, SelectFieldConfigSettings<string>>({
      path: 'statisticsTableColumns',
      name: 'Visible columns',
      description: 'Choose which columns to display in the statistics table',
      settings: {
        allowCustomValue: false,
        options: [
          { label: 'n', value: 'n' },
          { label: 'Mean', value: 'mean' },
          { label: 'Std Dev', value: 'stdDev' },
          { label: 'Min', value: 'min' },
          { label: 'Max', value: 'max' },
          { label: 'LCL', value: 'lcl' },
          { label: 'UCL', value: 'ucl' },
          { label: 'Cp', value: 'cp' },
          { label: 'Cpk', value: 'cpk' },
          { label: 'Pp', value: 'pp' },
          { label: 'Ppk', value: 'ppk' },
        ],
      },
      defaultValue: defaultOptions.statisticsTableColumns as any,
      showIf: (option) => option.showStatisticsTable === true,
      category: ['Statistics Table'],
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
            options: graphFieldOptions.fillGradient.filter((f) => f.value !== GraphGradientMode.Scheme),
          },
          category: ['Histogram'],
        });

      commonOptionsBuilder.addHideFrom(builder);
    },
  });
