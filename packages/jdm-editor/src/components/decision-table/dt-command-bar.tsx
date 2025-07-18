import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CloseOutlined,
  DeleteOutlined,
  ExportOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { Button, Divider, Popconfirm, Select, Tooltip, Typography, message } from 'antd';
import React, { useMemo, useRef } from 'react';
import { P, match } from 'ts-pattern';

import type { DecisionNode } from '../decision-graph';
import { Stack } from '../stack';
import { useDecisionTableActions, useDecisionTableRaw, useDecisionTableState } from './context/dt-store.context';
import { exportDecisionTable, readDecisionTableFile } from './excel';

export const DecisionTableCommandBar: React.FC = () => {
  const tableActions = useDecisionTableActions();
  const { disabled, debugIndex, traceCount, cursor } = useDecisionTableState(
    ({ disableHitPolicy, disabled, permission, decisionTable, cursor, debugIndex, debug }) => ({
      disableHitPolicy,
      disabled,
      permission,
      cursor,
      debugIndex,
      hitPolicy: decisionTable.hitPolicy,
      diffHitPolicy: decisionTable?._diff?.fields?.hitPolicy,
      traceCount: match(debug?.trace?.traceData)
        .with(P.array(), (some) => some.length)
        .otherwise(() => null),
    }),
  );

  const { listenerStore, stateStore } = useDecisionTableRaw();
  const fileInput = useRef<HTMLInputElement>(null);

  const exportExcel = async () => {
    try {
      const { decisionTable, name } = stateStore.getState();
      await exportDecisionTable(name ?? 'table', [
        { ...decisionTable, name: 'decision table', id: crypto.randomUUID() },
      ]);
      message.success('Excel file has been downloaded successfully!');
    } catch (e) {
      console.error('Failed to download Excel file!', e);
      message.error('Failed to download Excel file!');
    }
  };

  const importExcel = () => {
    fileInput?.current?.click?.();
  };

  const readExcelFile = async (event: any) => {
    const file = event?.target?.files[0];
    const reader = new FileReader();

    try {
      reader.readAsArrayBuffer(file);
      reader.onload = async () => {
        const buffer = reader.result as ArrayBuffer;

        if (!buffer) return;

        const table = stateStore.getState().decisionTable;
        const nodes: DecisionNode[] = await readDecisionTableFile(buffer, table);
        const newTable = nodes[0].content;

        tableActions.setDecisionTable(newTable);
        listenerStore.getState().onChange?.(newTable);
      };
      message.success('Excel file has been uploaded successfully!');
    } catch {
      message.error('Failed to upload Excel!');
    }
  };

  const traceIndexOptions = useMemo(() => {
    if (!traceCount) {
      return null;
    }

    return Array.from({ length: traceCount }).map((_, i) => ({
      label: String(i),
      value: i,
    }));
  }, [debugIndex, traceCount]);

  return (
    <>
      <Stack horizontal horizontalAlign={'space-between'} verticalAlign={'center'} className={'grl-dt__command-bar'}>
        <Stack gap={8} horizontal className='full-width'>
          <Button type='text' size={'small'} icon={<ExportOutlined />} onClick={exportExcel}>
            Export Excel
          </Button>
          <Button
            type='text'
            size={'small'}
            disabled={disabled}
            icon={<ImportOutlined />}
            onClick={() => importExcel()}
          >
            Import Excel
          </Button>
          {cursor && !disabled && (
            <>
              <Divider
                type={'vertical'}
                style={{
                  height: 24,
                }}
              />
              <Tooltip title={'Add row below'}>
                <Button
                  type='text'
                  size={'small'}
                  icon={<ArrowDownOutlined />}
                  onClick={() => tableActions.addRowBelow(cursor?.y)}
                />
              </Tooltip>
              <Tooltip title={'Add row above'}>
                <Button
                  type='text'
                  size={'small'}
                  icon={<ArrowUpOutlined />}
                  onClick={() => tableActions.addRowAbove(cursor?.y)}
                />
              </Tooltip>
              <Tooltip>
                <Popconfirm title='Remove row?' okText='Remove' onConfirm={() => tableActions.removeRow(cursor?.y)}>
                  <Button type='text' danger size={'small'} icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
              <Button type='text' size={'small'} icon={<CloseOutlined />} onClick={() => tableActions.setCursor(null)}>
                Deselect
              </Button>
            </>
          )}
        </Stack>
        {traceIndexOptions && (
          <Stack horizontal verticalAlign='center' horizontalAlign='end'>
            <Typography.Text style={{ fontSize: 12 }}>Simulation index:</Typography.Text>
            <Select
              size='small'
              style={{ fontSize: 12, minWidth: 60 }}
              options={traceIndexOptions}
              onChange={(debugIndex: number) => stateStore.setState({ debugIndex })}
              value={traceIndexOptions.some((t) => t.value === debugIndex) ? debugIndex : 0}
            />
            <Divider type='vertical' />
          </Stack>
        )}
      </Stack>
      <input
        multiple
        hidden
        accept='.xlsx'
        type='file'
        ref={fileInput}
        onChange={readExcelFile}
        onClick={(event) => {
          (event.target as any).value = null;
        }}
      />
    </>
  );
};
