import { Button, Dropdown, InlineField, Menu, Select, ValuePicker, useStyles2 } from '@grafana/ui';
import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, SelectableValue, StandardEditorProps } from '@grafana/data';
import { ConstantsOptions, defaultConstantColor } from 'types';
import { InlineColorField } from 'components/InlineColorField';
import { difference, uniqBy } from 'lodash';
import { selectableHalfToTen } from './selectableValues';
import {
  SpcParam,
  allSpcControls,
  allSpcParamsDict,
  availableSpcParams,
  availableSpcParamsWithData,
} from 'data/spcParams';
import { MenuItem } from './MenuItem';
import { Options } from 'components/Histogram/panelcfg';

type Props = StandardEditorProps<ConstantsOptions | undefined, any, Options>;

export function ConstantsListEditor({ value, onChange, context }: Props) {
  const styles = useStyles2(getStyles);
  const characteristicKeys = context.instanceState?.characteristicKeys as string[] | null | undefined;
  const hasTableData = context.instanceState?.hasTableData as boolean | null | undefined;
  const hasCustomTableData = context.instanceState?.hasCustomTableData as boolean | null | undefined;
  const prevAvailableFields = React.useRef<string[] | null>(null);

  const sampleSize = context.options?.spc?.sampleSize ?? 1;
  const aggregationType = context.options?.spc?.aggregation ?? 'mean';

  const availableFields = React.useMemo(() => {
    if (characteristicKeys == null) {
      return [];
    }
    if (hasCustomTableData) {
      return availableSpcParamsWithData(sampleSize, aggregationType, characteristicKeys);
    }
    if (!hasTableData) {
      return availableSpcParams(sampleSize, aggregationType);
    }
    return characteristicKeys;
  }, [aggregationType, characteristicKeys, hasCustomTableData, hasTableData, sampleSize]);

  React.useEffect(() => {
    if (availableFields.length === 0 || !hasTableData) {
      return;
    }
    if (prevAvailableFields.current != null) {
      const newFields = difference(availableFields, prevAvailableFields.current);

      if (newFields.length > 0) {
        const items = uniqBy(
          [
            ...(value?.items ?? []),
            ...newFields.map((fieldName) => ({
              name: fieldName,
              title: fieldName,
              color: defaultConstantColor,
              lineWidth: 2,
            })),
          ],
          'name'
        );

        onChange({
          ...value,
          items,
        });
      }
    }

    prevAvailableFields.current = [...availableFields];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableFields]);

  const notSelectedFields = React.useMemo(() => {
    return difference(availableFields, value?.items?.map((conf) => conf.name) ?? []);
  }, [availableFields, value?.items]);

  function onAddConstant() {}

  const menu = React.useMemo(() => {
    return (
      <Menu>
        {notSelectedFields?.map((fieldName) => (
          <MenuItem
            key={fieldName}
            onClick={() => {
              onChange({
                ...value,
                items: [
                  ...(value?.items ?? []),
                  {
                    name: fieldName,
                    title: allSpcParamsDict?.[fieldName as SpcParam] ?? fieldName,
                    color: defaultConstantColor,
                    lineWidth: 2,
                  },
                ],
              });
            }}
          >
            {allSpcParamsDict?.[fieldName as SpcParam] ?? fieldName}
          </MenuItem>
        ))}
      </Menu>
    );
  }, [notSelectedFields, onChange, value]);

  const currentItems = React.useMemo(() => {
    return value?.items?.filter((el) => availableFields.includes(el.name)) ?? [];
  }, [availableFields, value?.items]);

  const onControlLineAdd = (selectedControl: SelectableValue<string>) => {
    console.log('selected control = ' + selectedControl.value);
  };

  return (
    <>
      <div className={styles.wrapper}>
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
                  return control.type === 'standard' || control.type === 'sbar' || control.type === 'rbar';
                }
              }
              return control.type === 'standard' || control.type === 'xbar';
            })
            .map<SelectableValue<string>>((i) => ({ label: i.label, value: i.name, description: i.description }))}
          onChange={(selectedControl) => onControlLineAdd(selectedControl)}
        />
      </div>

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h5>{!value?.items?.length ? <i>Empty</i> : <></>}</h5>
          </div>

          <Dropdown overlay={menu}>
            <Button
              disabled={notSelectedFields.length === 0}
              icon="plus-circle"
              variant="success"
              fill="text"
              size="sm"
            >
              Add
            </Button>
          </Dropdown>
        </div>

        {currentItems.map((el, index) => (
          <div key={el.title} className={styles.row}>
            <div className={styles.fieldName}>{el.title}</div>
            {hasTableData && (
              <div>
                <input
                  className={styles.titleInput}
                  type="text"
                  value={el?.title}
                  size={el?.title.length}
                  onChange={(e) => {
                    if (value?.items) {
                      value.items[index].title = e.target.value;
                      onChange({ ...value });
                    }
                  }}
                />
              </div>
            )}
            <div className={styles.rightColumn}>
              <InlineField label={'Line Width'} className={styles.noMargin}>
                <Select
                  width={8}
                  options={selectableHalfToTen}
                  value={el.lineWidth}
                  onChange={(selected) => {
                    if (selected?.value != null && value?.items) {
                      const newItems = [...value.items];
                      const current = newItems.find((item) => item.name === el.name);
                      if (current) {
                        current.lineWidth = selected.value;
                        onChange({ ...value, items: newItems });
                      }
                    }
                  }}
                />
              </InlineField>
              <InlineColorField
                color={el?.color ?? defaultConstantColor}
                onChange={(newColor) => {
                  if (value?.items) {
                    const newItems = [...value.items];
                    const current = newItems.find((item) => item.name === el.name);
                    if (current) {
                      current.color = newColor;
                      onChange({ ...value, items: newItems });
                    }
                  }
                }}
              />
              <Button
                onClick={() => {
                  onChange({
                    ...value,
                    items: (value?.items ?? []).filter((conf) => conf.name !== el.name),
                  });
                }}
                icon="trash-alt"
                variant="destructive"
                fill="text"
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css`
      display: flex;
      flex-direction: column;
    `,

    container: css`
      background-color: ${theme.colors.background.canvas};
      padding: ${theme.spacing(1)};
      border-radius: ${theme.shape.borderRadius(2)};
    `,
    header: css`
      display: flex;
    `,
    headerTitle: css`
      flex-grow: 1;
    `,
    titleInput: css`
      background: #0000;
      border-radius: 3px;
      box-shadow: none;
      font-weight: 600;
      padding: 0px 8px;
      resize: none;
      outline: none;
      display: flex;
      -webkit-appearance: none;
      height: 100%;
      width: 100%;
      flex-grow: 0;
      flex-shrink: 0;

      &:focus {
        background-color: ${theme.colors.background.canvas};
        box-shadow: inset 0 0 0 2px ${theme.colors.primary.border};
      }
    `,
    row: css`
      display: flex;
      gap: ${theme.spacing(0.5)};
      margin-top: ${theme.spacing(0.5)};
      flex-wrap: wrap;
    `,
    fieldName: css`
      margin-top: auto;
      margin-bottom: auto;
      flex-grow: 0;
      flex-shrink: 0;
    `,
    rightColumn: css`
      justify-content: right;
      flex-grow: 1;
      flex-shrink: 1;
      display: flex;
      gap: ${theme.spacing(1)};
      flex-wrap: wrap;
    `,
    addButtonContainer: css`
      display: flex;
      justify-content: center;
    `,
    noMargin: css`
      margin: 0;
    `,
  };
};
