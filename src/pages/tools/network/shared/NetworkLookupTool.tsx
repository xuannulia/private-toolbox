import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField
} from '@mui/material';
import InputHeader from '@components/InputHeader';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { type JsonValue } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  callApiTool,
  type ApiToolResult,
  getApiBaseUrl,
  getApiToolErrorText,
  setApiBaseUrl,
  toNetworkErrorResult
} from '../service';
import {
  clearNetworkLookupHistory,
  getNetworkLookupHistory,
  recordNetworkLookupHistory,
  type NetworkLookupHistoryEntry
} from '../history';
import NetworkActionBar from './NetworkActionBar';
import NetworkHistoryChips from './NetworkHistoryChips';

export type NetworkField = {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: 'text' | 'number' | 'select';
  options?: { label: string; value: string }[];
  omitWhenEmpty?: boolean;
};

type NetworkLookupToolProps = ToolComponentProps & {
  toolName: string;
  fields: NetworkField[];
  runLabel?: string;
  renderResult?: (state: NetworkLookupResultState) => ReactNode;
};

export type NetworkLookupResultState = {
  result: ApiToolResult | null;
  resultText: string;
  errorText: string | null;
  loading: boolean;
};

const formatResult = (value: unknown): string => JSON.stringify(value, null, 2);

const toJsonValue = (field: NetworkField, value: string): JsonValue => {
  if (field.type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
};

export default function NetworkLookupTool({
  toolName,
  fields,
  runLabel,
  renderResult
}: NetworkLookupToolProps) {
  const { t } = useTranslation('network');
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      fields.map((field) => [field.name, field.defaultValue ?? ''])
    )
  );
  const [result, setResult] = useState('');
  const [toolResult, setToolResult] = useState<ApiToolResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<NetworkLookupHistoryEntry[]>(() =>
    getNetworkLookupHistory(toolName)
  );

  const updateValue = (name: string, value: string) => {
    setValues((current) => ({
      ...current,
      [name]: value
    }));
  };

  const run = async () => {
    setLoading(true);
    setErrorText(null);
    setToolResult(null);
    setApiBaseUrl(apiBaseUrl);
    setHistory(recordNetworkLookupHistory(toolName, fields, values));

    const args = Object.fromEntries(
      fields.flatMap((field) => {
        const value = values[field.name] ?? '';
        if (field.omitWhenEmpty && !value.trim()) return [];
        return [[field.name, toJsonValue(field, value)]];
      })
    ) as Record<string, JsonValue>;

    try {
      const response = await callApiTool(toolName, args, apiBaseUrl);
      setToolResult(response);
      setErrorText(getApiToolErrorText(response));
      setResult(formatResult(response.ok ? response.result : response.error));
    } catch (error) {
      const errorResult = toNetworkErrorResult(
        'API_UNAVAILABLE',
        'Unable to reach local API',
        error
      );
      setToolResult(errorResult);
      setErrorText(getApiToolErrorText(errorResult));
      setResult(formatResult(errorResult.error));
    } finally {
      setLoading(false);
    }
  };

  const applyHistory = (entry: NetworkLookupHistoryEntry) => {
    setValues((current) => ({
      ...current,
      ...entry.values
    }));
  };

  const clearHistory = () => {
    clearNetworkLookupHistory(toolName);
    setHistory([]);
  };

  const input = (
    <Box>
      <InputHeader title={t('common.query')} />
      <Stack spacing={1.5}>
        {fields.map((field) => {
          if (field.type === 'select') {
            return (
              <FormControl fullWidth key={field.name} size={'small'}>
                <InputLabel>{field.label}</InputLabel>
                <Select
                  label={field.label}
                  value={values[field.name] ?? ''}
                  onChange={(event) =>
                    updateValue(field.name, event.target.value)
                  }
                  sx={{ backgroundColor: 'background.paper' }}
                >
                  {(field.options ?? []).map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }

          return (
            <TextField
              key={field.name}
              fullWidth
              size={'small'}
              label={field.label}
              placeholder={field.placeholder}
              value={values[field.name] ?? ''}
              type={field.type === 'number' ? 'number' : 'text'}
              onChange={(event) => updateValue(field.name, event.target.value)}
              sx={{ backgroundColor: 'background.paper' }}
            />
          );
        })}
        <NetworkActionBar
          apiBaseUrl={apiBaseUrl}
          apiBaseUrlLabel={t('common.apiBaseUrl')}
          loading={loading}
          runLabel={runLabel ?? t('common.run')}
          onApiBaseUrlChange={setApiBaseUrlState}
          onRun={run}
        />
        <NetworkHistoryChips
          clearLabel={t('common.clearHistory')}
          entries={history}
          title={t('common.history')}
          onApply={applyHistory}
          onClear={clearHistory}
        />
      </Stack>
    </Box>
  );

  const defaultResult = (
    <Stack spacing={1.5}>
      {errorText && <Alert severity={'error'}>{errorText}</Alert>}
      <ToolTextResult
        title={t('common.result')}
        value={result}
        extension={'json'}
        keepSpecialCharacters
        loading={loading}
      />
    </Stack>
  );

  return (
    <ToolInputAndResult
      input={input}
      result={
        renderResult
          ? renderResult({
              result: toolResult,
              resultText: result,
              errorText,
              loading
            })
          : defaultResult
      }
    />
  );
}
