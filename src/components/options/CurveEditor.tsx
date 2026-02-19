import React, { useState } from 'react';
import { css } from '@emotion/css';
import { DataFrame, GrafanaTheme2, SelectableValue, StandardEditorProps, getFrameDisplayName } from '@grafana/data';
import { Button, ColorPicker, Combobox, Field, Icon, IconButton, Slider, Stack, useStyles2, useTheme2 } from '@grafana/ui';
import { CurveOptions, Options, selectableCurves } from 'panelcfg';
import { CurveFit } from 'types';

export const CurveEditor = ({ item, value, onChange, context }: StandardEditorProps<CurveOptions[], Options>) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const defaultCurveColor = theme.visualization.getColorByName('dark-green');
  const [expandedHandles, setExpandedHandles] = useState<number[]>([]);

  const addExpandedHandle = (handle: number) => {
    setExpandedHandles([...expandedHandles, handle]);
  };

  const removeExpandedHandles = (handle: number) => {
    setExpandedHandles(expandedHandles.filter((h) => h !== handle));
  };
  const toggleHandle = (handle: number) => {
    if (expandedHandles.includes(handle)) {
      removeExpandedHandles(handle);
    } else {
      addExpandedHandle(handle);
    }
  };

  const handleCurveOptionChange = (index: number, field: keyof CurveOptions, fieldValue: any) => {
    const newCurves = [...value];
    newCurves[index] = { ...newCurves[index], [field]: fieldValue };
    onChange(newCurves);
  };

  const onRemoveCurveByNameClick = (curveIndexToRemove: number) => {
    const newCurves = value.filter((_, i) => i !== curveIndexToRemove);
    onChange(newCurves);

    //remove handle and lower indexes on all expanded upper handles
    const newIndexes = expandedHandles
      .filter((h) => h !== curveIndexToRemove)
      .map((handleIndex) => (handleIndex > curveIndexToRemove ? handleIndex - 1 : handleIndex));
    setExpandedHandles(newIndexes);
  };

  const selectableCurvesOptions = selectableCurves.map<SelectableValue<CurveFit>>((i) => ({
    label: i.name,
    value: i.id,
    description: i.description,
  }));

  function handelAddCurveClick() {
    const newCurve = {
      fit: CurveFit.histogram,
      name: CurveFit.histogram,
      seriesIndex: 0,
      lineWidth: 4,
      color: 'yellow',
    };
    const newCurves = [...value, newCurve];
    onChange(newCurves);

    setExpandedHandles([newCurves.length - 1]);
  }

  function getFilteredDataFrames(): DataFrame[] {
    const { featureQueryRefIds } = context.options;
    return context.data.filter((frame) => !featureQueryRefIds || !featureQueryRefIds.includes(frame.refId!));
  }

  function getCurveDisplayName(curve: CurveOptions): React.JSX.Element {
    const seriesData = getFilteredDataFrames();

    if (seriesData && seriesData.length > 1 && seriesData[curve.seriesIndex]) {
      return (
        <span>
          {curve.fit}
          <Icon name="angle-right" className={styles.chevron} />
          {seriesData[curve.seriesIndex].refId}
          <Icon name="angle-right" className={styles.chevron} />
          {getFrameDisplayName(seriesData[curve.seriesIndex], curve.seriesIndex)}
        </span>
      );
    }

    if (seriesData && seriesData.length <= curve.seriesIndex) {
      return (
        <span>
          {curve.fit} <Icon name="angle-right" className={styles.chevron} />
          (stale series)
        </span>
      );
    }

    return <span>{curve.fit}</span>;
  }

  return (
    <>
      <div className={styles.addControlwrapper}>
        <Button icon="plus" variant="secondary" size="md" fullWidth={true} onClick={handelAddCurveClick}>
          Add curve
        </Button>
      </div>

      {value.map((curve, index) => (
        <div className={styles.controlItemWrapper} key={index}>
          <div className={styles.controlHeaderWrapper}>
            <Stack direction="column" gap={1}>
              <Stack direction="row" alignItems="center" gap={1}>
                <span></span>
                <IconButton
                  name={expandedHandles.includes(index) ? 'angle-down' : 'angle-right'}
                  onClick={() => toggleHandle(index)}
                  aria-label="Collapse"
                />{' '}
                <span className={styles.controlHeaderTitle}>{getCurveDisplayName(curve)}</span>
                <span className={css({ flex: 1 })} />
                <Stack direction="row" gap={0.5}>
                  <Button
                    variant="secondary"
                    icon="trash-alt"
                    size="sm"
                    type="button"
                    onClick={() => onRemoveCurveByNameClick(index)}
                  >
                    Remove
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </div>
          {expandedHandles.includes(index) && (
            <Stack direction="row" alignItems="center" gap={1}>
              <div className={styles.fieldContainer}>
                <Field label="Fit" description="Choose how to fit a curve to histogram data.">
                  <Combobox
                    placeholder="Select fit model"
                    isClearable={true}
                    value={curve.fit}
                    options={selectableCurvesOptions.map((opt) => ({
                      label: opt.label || '',
                      value: opt.value as string,
                      description: opt.description,
                    }))}
                    onChange={(value) => {
                      value?.value && handleCurveOptionChange(index, 'fit', value.value as CurveFit);
                    }}
                  />
                </Field>
                {/* <Field label="Name">
                  <Input
                    placeholder={'Name'}
                    value={curve.name}
                    onChange={(e) => handleCurveOptionChange(index, 'name', e.currentTarget.value)}
                  />
                </Field> */}
                <Field label="Series" description="Select the series for which to calculate this curve.">
                  <Combobox
                    placeholder="Select series"
                    isClearable={true}
                    value={curve.seriesIndex}
                    options={context.data
                      .filter((frame) => {
                        return (
                          !context.options.featureQueryRefIds ||
                          !context.options.featureQueryRefIds.includes(frame.refId!)
                        );
                      })
                      .map((frame, index) => ({
                        value: index,
                        label: `${frame.refId} > ${getFrameDisplayName(frame, index)}`,
                      }))}
                    onChange={(value) => {
                      value?.value !== undefined && handleCurveOptionChange(index, 'seriesIndex', value.value);
                    }}
                  />
                </Field>
                <Field label="Line width">
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={curve.lineWidth}
                    onChange={(value) => handleCurveOptionChange(index, 'lineWidth', value)}
                  />
                </Field>
                <Field label="Line color">
                  <div className={styles.colorPickerWrapper}>
                    <ColorPicker
                      color={curve.color ?? defaultCurveColor}
                      onChange={(color) => {
                        {
                          handleCurveOptionChange(index, 'color', color);
                        }
                      }}
                    ></ColorPicker>
                  </div>
                </Field>
              </div>
            </Stack>
          )}
        </div>
      ))}
    </>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    addControlwrapper: css({
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: theme.spacing(1),
    }),
    colorPickerWrapper: css({
      width: theme.spacing(2.25),
    }),
    controlItemWrapper: css({
      flex: 1,
      position: 'relative',
      background: theme.colors.background.primary,
      borderRadius: theme.shape.radius.default,
      borderColor: theme.colors.secondary.borderTransparent,
    }),
    controlHeaderWrapper: css({
      padding: theme.spacing(0.5),
      flex: 1,
      position: 'relative',
      background: theme.colors.background.secondary,
      borderRadius: theme.shape.radius.default,
      borderColor: theme.colors.secondary.borderTransparent,
    }),
    fieldContainer: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      padding: theme.spacing(1),
    }),
    controlHeaderTitle: css({
      color: theme.colors.text.secondary,
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.bodySmall.fontWeight,
    }),
    chevron: css({
      margin: theme.spacing(0, 0.25),
    }),
  };
};
