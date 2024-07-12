import React, { useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue, StandardEditorProps, getFrameDisplayName } from '@grafana/data';
import {
  Button,
  ColorPicker,
  Field,
  IconButton,
  Input,
  RadioButtonGroup,
  Select,
  Slider,
  Stack,
  ValuePicker,
  useStyles2,
} from '@grafana/ui';
import { ControlLine, Options } from 'components/Histogram/panelcfg';
import { SpcChartTyp, defaultConstantColor } from 'types';
import { ControlLineReducer, ControlLineReducerId, controlLineReducers } from 'data/spcReducers';

export const ControlLineEditor = ({ item, value, onChange, context }: StandardEditorProps<ControlLine[], Options>) => {
  const styles = useStyles2(getStyles);
  const chartType = context.options.chartType ? context.options.chartType : SpcChartTyp.none;
  const [expandedHandles, setExpandedHandles] = useState<number[]>([]);
  const [selectedChartType, setSelectedChartType] = useState<SpcChartTyp>(chartType);

  if (chartType !== selectedChartType) {
    //selected chart type option was changed
    setSelectedChartType(chartType);

    if (chartType === SpcChartTyp.none) {
      // remove lcl, ucl if they exist
      const spcControlIds = [ControlLineReducerId.lcl, ControlLineReducerId.ucl];
      const newControlLines = value.filter((cl) => !spcControlIds.includes(cl.reducerId));

      onChange(newControlLines);
    } else {
      // add lcl, ucl, and mean for control charts
      const spcControls = controlLineReducers.filter(
        (c) =>
          c.id === ControlLineReducerId.lcl || c.id === ControlLineReducerId.ucl || c.id === ControlLineReducerId.mean
      );
      addControlLines(spcControls);
    }
  }

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

  const handleControlLineChange = (index: number, field: keyof ControlLine, fieldValue: any) => {
    const newControlLines = [...value];
    newControlLines[index] = { ...newControlLines[index], [field]: fieldValue };
    onChange(newControlLines);
  };

  const onControlLineChange = (selectedControl: SelectableValue<ControlLineReducer>) => {
    if (!selectedControl.value) {
      throw new Error('Selected SPC control is not valid.');
    }
    addControlLine(selectedControl.value);
  };

  const onRemoveControlLineByNameClick = (controlIndexToRemove: number) => {
    const newControlLines = value.filter((_, i) => i !== controlIndexToRemove);
    onChange(newControlLines);

    //remove handle and lower indexes on all expanded upper handles
    const newIndexes = expandedHandles
      .filter((h) => h !== controlIndexToRemove)
      .map((handleIndex) => (handleIndex > controlIndexToRemove ? handleIndex - 1 : handleIndex));
    setExpandedHandles(newIndexes);
  };

  function createControlLine(reducer: ControlLineReducer): ControlLine {
    // if (reducer.computed || reducer.isStandard) {
    //   //we should only have one of the computed and standard lines for each
    // }

    return {
      reducerId: reducer.id,
      name: reducer.name,
      position: 0,
      seriesIndex: 0,
      lineWidth: 1,
      lineColor: reducer.color,
      fill: 0,
      fillDirection: 0,
      fillOpacity: 20,
    };
  }

  function addControlLine(reducer: ControlLineReducer) {
    // if (reducer.computed || reducer.isStandard) {
    //   //we should only have one of the computed and standard lines for each
    // }

    const newControlLine = createControlLine(reducer);
    if (!canAddReducer(reducer)) {
      return;
    }

    const newControlLines = [...value, newControlLine];
    onChange(newControlLines);

    setExpandedHandles([newControlLines.length - 1]);
  }

  function addControlLines(reducers: ControlLineReducer[]) {
    const controlLines = reducers.filter((reducer) => canAddReducer(reducer)).map((cl) => createControlLine(cl));
    if (controlLines.length > 0) {
      const newControlLines = [...value, ...controlLines];
      onChange(newControlLines);
      setExpandedHandles([newControlLines.length - 1]);
    }
  }

  function canAddReducer(reducer: ControlLineReducer): boolean {
    if (!reducer.computed && !reducer.isStandard) {
      //we can add as many constant control lines as we want
      return true;
    }

    const existingClr = value.filter((cl) => cl.reducerId === reducer.id);

    if (existingClr.length >= context.data.length) {
      return false;
    }

    return true;
  }

  function getControlLineDisplayName(controlLine: ControlLine): string {
    if (context.data && context.data.length > 1 && context.data[controlLine.seriesIndex]) {
      return `${controlLine.name} (${getFrameDisplayName(context.data[controlLine.seriesIndex], controlLine.seriesIndex)})`;
    }

    if (context.data && context.data.length <= controlLine.seriesIndex) {
      return `${controlLine.name} (stale series)`;
    }

    return controlLine.name;
  }

  return (
    <>
      <div className={styles.addControlwrapper}>
        <ValuePicker
          icon="plus"
          label="Add control line"
          variant="secondary"
          menuPlacement="auto"
          isFullWidth={true}
          size="md"
          options={controlLineReducers.map<SelectableValue<ControlLineReducer>>((i) => ({
            label: i.name,
            value: i,
            description: i.description,
          }))}
          onChange={(selectedControl) => onControlLineChange(selectedControl)}
        />
      </div>

      {value.map((controlLine, index) => (
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
                <span className={styles.controlHeaderTitle}>{getControlLineDisplayName(controlLine)}</span>
                <span className={css({ flex: 1 })} />
                <Stack direction="row" gap={0.5}>
                  <Button
                    variant="secondary"
                    icon="trash-alt"
                    size="sm"
                    type="button"
                    onClick={() => onRemoveControlLineByNameClick(index)}
                  >
                    Remove control
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </div>
          {expandedHandles.includes(index) && (
            <Stack direction="row" alignItems="center" gap={1}>
              <div className={styles.fieldContainer}>
                <Field label="Name">
                  <Input
                    placeholder={'Name'}
                    value={controlLine.name}
                    onChange={(e) => handleControlLineChange(index, 'name', e.currentTarget.value)}
                  />
                </Field>
                {controlLine.reducerId === ControlLineReducerId.custom && (
                  <Field label="Position" description="Numeric position at which the control line is drawn. ">
                    <Input
                      placeholder={'Value'}
                      type="number"
                      step="0.01"
                      value={controlLine.position}
                      onChange={(e) => handleControlLineChange(index, 'position', parseFloat(e.currentTarget.value))}
                    />
                  </Field>
                )}
                <Field label="Series" description="Select the series for which to calculate this control.">
                  <Select
                    placeholder="Select series"
                    isClearable={true}
                    value={controlLine.seriesIndex}
                    options={context.data.map((frame, index) => ({
                      value: index,
                      label: `${getFrameDisplayName(frame, index)}`,
                    }))}
                    onChange={(value) => {
                      handleControlLineChange(index, 'seriesIndex', value.value);
                    }}
                  />
                </Field>
                <Field label="Line width">
                  <Slider min={1} max={10} step={1} value={controlLine.lineWidth} />
                </Field>
                <Field label="Line color">
                  <div style={{ width: '18px' }}>
                    <ColorPicker
                      color={controlLine.lineColor ?? defaultConstantColor}
                      onChange={(color) => {
                        {
                          handleControlLineChange(index, 'lineColor', color);
                        }
                      }}
                    ></ColorPicker>
                  </div>
                </Field>
                <Field label="Fill">
                  <RadioButtonGroup
                    value={controlLine.fill}
                    options={[
                      { description: 'Left fill', value: -1, icon: 'arrow-to-right' },
                      { description: 'No fill', value: 0, icon: 'eye-slash' },
                      { description: 'Right fill', value: 1, icon: 'arrow-from-right' },
                    ]}
                    onChange={(value) => {
                      handleControlLineChange(index, 'fill', value);
                    }}
                  ></RadioButtonGroup>
                </Field>
                <Field label="Fill opacity">
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={controlLine.fillOpacity}
                    onChange={(value) => handleControlLineChange(index, 'fillOpacity', value)}
                  />
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
