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
import { defaultConstantColor } from 'types';
import { SpcControl, allSpcControls } from 'data/spcParams';

export const ControlLineEditor = ({ item, value, onChange, context }: StandardEditorProps<ControlLine[], Options>) => {
  const styles = useStyles2(getStyles);
  const [expandedHandles, setExpandedHandles] = useState<number[]>([]);
  const sampleSize = context.options?.sampleSize ?? 1;
  const aggregationType = context.options?.aggregationType;

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

  const addControlLine = (selectedControl: SelectableValue<SpcControl>) => {
    if (!selectedControl.value) {
      throw new Error('Selected SPC control is not valid.');
    }

    const selectedSpcControl = selectedControl.value;

    const newControlLine = {
      name: selectedSpcControl.label,
      position: 0,
      seriesIndex: 0,
      lineWidth: 1,
      lineColor: selectedSpcControl.color,
      fill: 0,
      fillDirection: 0,
      fillOpacity: 20,
      type: selectedSpcControl.type,
    };
    const newControlLines = [...value, newControlLine];
    onChange(newControlLines);

    setExpandedHandles([newControlLines.length - 1]);
  };

  const removeControlLineByName = (controlIndexToRemove: number) => {
    const newControlLines = value.filter((_, i) => i !== controlIndexToRemove);
    onChange(newControlLines);

    //remove handle and lower indexes on all expanded upper handles
    const newIndexes = expandedHandles
      .filter((h) => h !== controlIndexToRemove)
      .map((handleIndex) => (handleIndex > controlIndexToRemove ? handleIndex - 1 : handleIndex));
    setExpandedHandles(newIndexes);
  };

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
          options={allSpcControls
            .filter((control) => {
              if (sampleSize > 1 && sampleSize <= 10) {
                if (aggregationType === 'mean') {
                  // Show all standard types, sbar and rbar
                  return (
                    control.type === 'standard' ||
                    control.type === 'sbar' ||
                    control.type === 'rbar' ||
                    control.type === 'computed'
                  );
                }
              }
              return control.type === 'standard' || control.type === 'computed' || control.type === 'xbar';
            })
            .map<SelectableValue<SpcControl>>((i) => ({ label: i.label, value: i, description: i.description }))}
          onChange={(selectedControl) => addControlLine(selectedControl)}
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
                    onClick={() => removeControlLineByName(index)}
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
                <Field label="Position" description="Numeric position at which the control line is drawn. ">
                  <Input
                    placeholder={'Value'}
                    type="number"
                    step="0.01"
                    value={controlLine.position}
                    onChange={(e) => handleControlLineChange(index, 'position', parseFloat(e.currentTarget.value))}
                  />
                </Field>
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
