import {
  Alert,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { type JsonValue } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  callApiTool,
  getApiBaseUrl,
  getApiToolErrorText,
  setApiBaseUrl,
  toNetworkErrorResult
} from '../service';
import {
  clearHttpHistory,
  getHttpHistory,
  recordHttpHistory,
  type HttpHistoryEntry
} from '../httpHistory';
import NetworkActionBar from '../shared/NetworkActionBar';
import NetworkHistoryChips from '../shared/NetworkHistoryChips';

type HttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS';

const methods: HttpMethod[] = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS'
];

type HttpRequestHistoryValues = {
  method: HttpMethod;
  url: string;
  headers: string;
  body: string;
  followRedirects: boolean;
};

const formatResult = (value: unknown): string => JSON.stringify(value, null, 2);

const parseHeaders = (value: string): Record<string, string> => {
  if (!value.trim()) return {};

  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Headers must be a JSON object');
  }

  return Object.fromEntries(
    Object.entries(parsed as Record<string, unknown>).map(([key, item]) => [
      key,
      String(item)
    ])
  );
};

export default function HttpRequest({ title }: ToolComponentProps) {
  const { t } = useTranslation('network');
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [url, setUrl] = useState('https://example.com');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headers, setHeaders] = useState(
    '{\n  "accept": "application/json, text/plain, */*"\n}'
  );
  const [body, setBody] = useState('');
  const [followRedirects, setFollowRedirects] = useState(true);
  const [result, setResult] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    HttpHistoryEntry<HttpRequestHistoryValues>[]
  >(() => getHttpHistory<HttpRequestHistoryValues>('http.request'));

  const getHistoryValues = (): HttpRequestHistoryValues => ({
    method,
    url,
    headers,
    body,
    followRedirects
  });

  const run = async () => {
    setLoading(true);
    setErrorText(null);
    setApiBaseUrl(apiBaseUrl);

    try {
      const args: Record<string, JsonValue> = {
        url,
        method,
        headers: parseHeaders(headers),
        followRedirects
      };

      if (body.trim()) {
        args.body = body;
      }

      setHistory(
        recordHttpHistory(
          'http.request',
          `${method} ${url}`,
          getHistoryValues()
        )
      );

      const response = await callApiTool('http.request', args, apiBaseUrl);
      setErrorText(getApiToolErrorText(response));
      setResult(formatResult(response.ok ? response.result : response.error));
    } catch (error) {
      const errorResult = toNetworkErrorResult(
        'HTTP_REQUEST_INPUT_ERROR',
        'Unable to run request',
        error
      );
      setErrorText(getApiToolErrorText(errorResult));
      setResult(formatResult(errorResult.error));
    } finally {
      setLoading(false);
    }
  };

  const applyHistory = (entry: HttpHistoryEntry<HttpRequestHistoryValues>) => {
    setMethod(entry.values.method);
    setUrl(entry.values.url);
    setHeaders(entry.values.headers);
    setBody(entry.values.body);
    setFollowRedirects(entry.values.followRedirects);
  };

  const clearHistory = () => {
    clearHttpHistory('http.request');
    setHistory([]);
  };

  const input = (
    <Box>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <FormControl
            fullWidth
            size={'small'}
            sx={{ flex: { sm: '0 0 150px' } }}
          >
            <InputLabel>{t('httpRequest.method')}</InputLabel>
            <Select
              label={t('httpRequest.method')}
              value={method}
              onChange={(event) => setMethod(event.target.value as HttpMethod)}
              sx={{ backgroundColor: 'background.paper' }}
            >
              {methods.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size={'small'}
            label={t('httpRequest.url')}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            sx={{ backgroundColor: 'background.paper' }}
          />
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={3}
          label={t('httpRequest.headers')}
          value={headers}
          onChange={(event) => setHeaders(event.target.value)}
          sx={{ backgroundColor: 'background.paper' }}
        />
        <TextField
          fullWidth
          multiline
          minRows={4}
          label={t('httpRequest.body')}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          sx={{ backgroundColor: 'background.paper' }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={followRedirects}
              onChange={(event) => setFollowRedirects(event.target.checked)}
            />
          }
          label={t('httpRequest.followRedirects')}
        />
        <NetworkActionBar
          apiBaseUrl={apiBaseUrl}
          apiBaseUrlLabel={t('common.apiBaseUrl')}
          loading={loading}
          runLabel={t('httpRequest.send')}
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

  return (
    <ToolInputAndResult
      input={input}
      result={
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
      }
    />
  );
}
