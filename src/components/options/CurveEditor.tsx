import React, { useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue, StandardEditorProps, getFrameDisplayName } from '@grafana/data';
import { Button, ColorPicker, Field, IconButton, Select, Slider, Stack, useStyles2 } from '@grafana/ui';
import { CurveOptions, Options, selectableCurves } from 'panelcfg';
import { CurveFit } from 'types';

const defaultConstantColor = '#37872d';

export const CurveEditor = ({ item, value, onChange, context }: StandardEditorProps<CurveOptions[], Options>) => {
  const styles = useStyles2(getStyles);
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

  // const onCurveOptionChange = (selectedCurve: SelectableValue<SelectableCurve>) => {
  //   if (!selectedCurve.value) {
  //     throw new Error('Selected curve is not valid.');
  //   }
  //   addCurve(selectedCurve.value);
  // };

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

  // function createCurve(selectedCurve: SelectableCurve, seriesIndex: number): CurveOptions {
  //   return {
  //     fit: selectedCurve.id,
  //     name: selectedCurve.id,
  //     seriesIndex: seriesIndex,
  //     lineWidth: 4,
  //     color: selectedCurve.color,
  //   };
  // }

  // function addCurve(selectedCurve: SelectableCurve) {
  //   const availableIndex = getAvailableSeriesIndexForCurve(selectedCurve.id);
  //   if (availableIndex === -1) {
  //     return;
  //   }

  //   if (!canAddCurve(selectedCurve, availableIndex)) {
  //     return;
  //   }
  //   const newCurve = createCurve(selectedCurve, availableIndex);
  //   const newCurves = [...value, newCurve];
  //   onChange(newCurves);

  //   setExpandedHandles([newCurves.length - 1]);
  // }

  // function getAvailableSeriesIndexForCurve(curveFit: CurveFit): number {
  //   const usedIndex = value.filter((existingCl) => existingCl.fit === curveFit).map((i) => i.seriesIndex);
  //   const allIndexes = context.data.map((_, index) => index);
  //   const availableIndex = allIndexes.filter((i) => !usedIndex.includes(i));

  //   if (availableIndex.length === 0) {
  //     return -1;
  //   }
  //   return availableIndex[0];
  // }

  // function canAddCurve(selectedCurve: SelectableCurve, seriesIndex?: number): boolean {
  //   const series = seriesIndex ?? getAvailableSeriesIndexForCurve(selectedCurve.id);

  //   if (series === -1) {
  //     return false;
  //   }

  //   const existingCurve = value.filter((cl) => cl.fit === selectedCurve.id);

  //   if (existingCurve.length >= context.data.length) {
  //     return false;
  //   }

  //   return true;
  // }

  function getCurveDisplayName(curve: CurveOptions): string {
    if (context.data && context.data.length > 1 && context.data[curve.seriesIndex]) {
      return `${curve.name} (${getFrameDisplayName(context.data[curve.seriesIndex], curve.seriesIndex)})`;
    }

    if (context.data && context.data.length <= curve.seriesIndex) {
      return `${curve.name} (stale series)`;
    }

    return curve.name;
  }

  return (
    <>
      <div className={styles.addControlwrapper}>
        <Button icon="plus" variant="secondary" size="md" fullWidth={true} onClick={handelAddCurveClick}>
          Add curve
        </Button>
        {/* <ValuePicker
          icon="plus"
          label=""
          variant="secondary"
          menuPlacement="auto"
          isFullWidth={true}
          size="md"
          options={selectableCurvesOptions}
          onChange={(selectedCurveOption) => onCurveOptionChange(selectedCurveOption)}
        /> */}
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
                  <Select
                    placeholder="Select fit model"
                    isClearable={true}
                    value={curve.fit}
                    options={selectableCurvesOptions}
                    onChange={(value) => {
                      handleCurveOptionChange(index, 'fit', value.value);
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
                  <Select
                    placeholder="Select series"
                    isClearable={true}
                    value={curve.seriesIndex}
                    options={context.data.map((frame, index) => ({
                      value: index,
                      label: `${getFrameDisplayName(frame, index)}`,
                    }))}
                    onChange={(value) => {
                      handleCurveOptionChange(index, 'seriesIndex', value.value);
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
                  <div style={{ width: '18px' }}>
                    <ColorPicker
                      color={curve.color ?? defaultConstantColor}
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
    addControlwrapper: css`
      display: flex;
      flex-direction: column;
      padding-bottom: 8px;
    `,
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
  };
};
