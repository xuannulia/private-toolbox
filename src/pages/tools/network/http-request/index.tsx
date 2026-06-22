import {
  Alert,
  Box,
  Checkbox,
  Chip,
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

type HttpRequestResult = {
  url: string;
  finalUrl: string;
  method: HttpMethod;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  bodyText: string;
  bodyBytes: number;
  responseTimeMs?: number;
  redirected: boolean;
  redirects: string[];
};

const methods: HttpMethod[] = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS'
];

const methodsWithBody: HttpMethod[] = ['POST', 'PUT', 'PATCH', 'DELETE'];

type HttpRequestHistoryValues = {
  method: HttpMethod;
  url: string;
  headers: string;
  body: string;
  followRedirects: boolean;
  timeoutMs: number;
  maxResponseBytesKb: number;
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

const parseHeaders = (value: string): Record<string, string> => {
  const trimmed = value.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Headers must be an object');
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, item]) => [
        key,
        String(item)
      ])
    );
  }

  return Object.fromEntries(
    trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex <= 0) {
          throw new Error(`Invalid header line: ${line}`);
        }

        return [
          line.slice(0, separatorIndex).trim(),
          line.slice(separatorIndex + 1).trim()
        ];
      })
      .filter(([key]) => key.length > 0)
  );
};

const getResponseSeverity = (
  status: number
): 'success' | 'warning' | 'error' =>
  status >= 200 && status < 400
    ? 'success'
    : status >= 400
      ? 'error'
      : 'warning';

const getBodyExtension = (headers: Record<string, string>): string => {
  const contentType = headers['content-type']?.toLowerCase() ?? '';
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('html')) return 'html';
  if (contentType.includes('xml')) return 'xml';
  if (contentType.includes('css')) return 'css';
  if (contentType.includes('javascript')) return 'js';
  return 'txt';
};

export default function HttpRequest({ title }: ToolComponentProps) {
  const { t } = useTranslation('network');
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [url, setUrl] = useState('https://example.com');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [headers, setHeaders] = useState(
    'accept: application/json, text/plain, */*'
  );
  const [body, setBody] = useState('');
  const [followRedirects, setFollowRedirects] = useState(true);
  const [timeoutMs, setTimeoutMs] = useState(8000);
  const [maxResponseBytesKb, setMaxResponseBytesKb] = useState(1024);
  const [result, setResult] = useState<HttpRequestResult | null>(null);
  const [rawResult, setRawResult] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    HttpHistoryEntry<HttpRequestHistoryValues>[]
  >(() => getHttpHistory<HttpRequestHistoryValues>('http.request'));
  const canSendBody = methodsWithBody.includes(method);

  const getHistoryValues = (): HttpRequestHistoryValues => ({
    method,
    url,
    headers,
    body,
    followRedirects,
    timeoutMs,
    maxResponseBytesKb
  });

  const run = async () => {
    setLoading(true);
    setErrorText(null);
    setResult(null);
    setRawResult('');
    setApiBaseUrl(apiBaseUrl);

    try {
      const args: Record<string, JsonValue> = {
        url,
        method,
        headers: parseHeaders(headers),
        followRedirects,
        timeoutMs,
        maxResponseBytes: Math.max(1, maxResponseBytesKb) * 1024
      };

      if (canSendBody && body.trim()) {
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

      if (response.ok) {
        const value = response.result as unknown as HttpRequestResult;
        setResult(value);
        setRawResult(formatJson(value));
      } else {
        setRawResult(formatJson(response.error));
      }
    } catch (error) {
      const errorResult = toNetworkErrorResult(
        'HTTP_REQUEST_INPUT_ERROR',
        'Unable to run request',
        error
      );
      setErrorText(getApiToolErrorText(errorResult));
      setRawResult(formatJson(errorResult.error));
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
    setTimeoutMs(entry.values.timeoutMs ?? 8000);
    setMaxResponseBytesKb(entry.values.maxResponseBytesKb ?? 1024);
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
            sx={{ flex: { sm: '0 0 140px' } }}
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
          placeholder={t('httpRequest.headersPlaceholder')}
          value={headers}
          onChange={(event) => setHeaders(event.target.value)}
          sx={{ backgroundColor: 'background.paper' }}
        />
        {canSendBody ? (
          <TextField
            fullWidth
            multiline
            minRows={5}
            label={t('httpRequest.body')}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            sx={{ backgroundColor: 'background.paper' }}
          />
        ) : null}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size={'small'}
            type={'number'}
            label={t('httpRequest.timeoutMs')}
            value={timeoutMs}
            onChange={(event) =>
              setTimeoutMs(Math.max(100, Number(event.target.value) || 100))
            }
            sx={{ backgroundColor: 'background.paper' }}
          />
          <TextField
            fullWidth
            size={'small'}
            type={'number'}
            label={t('httpRequest.maxResponseKb')}
            value={maxResponseBytesKb}
            onChange={(event) =>
              setMaxResponseBytesKb(
                Math.max(1, Number(event.target.value) || 1)
              )
            }
            sx={{ backgroundColor: 'background.paper' }}
          />
          <FormControlLabel
            sx={{ flexShrink: 0 }}
            control={
              <Checkbox
                checked={followRedirects}
                onChange={(event) => setFollowRedirects(event.target.checked)}
              />
            }
            label={t('httpRequest.followRedirects')}
          />
        </Stack>
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
          {result ? (
            <>
              <Alert severity={getResponseSeverity(result.status)}>
                <Stack direction={'row'} spacing={1} flexWrap={'wrap'}>
                  <Chip
                    size={'small'}
                    label={`${result.status} ${result.statusText}`.trim()}
                  />
                  <Chip size={'small'} label={result.method} />
                  <Chip
                    size={'small'}
                    label={`${result.responseTimeMs ?? 0} ms`}
                  />
                  <Chip size={'small'} label={`${result.bodyBytes} bytes`} />
                  {result.redirected ? (
                    <Chip
                      size={'small'}
                      label={`${t('httpRequest.redirects')}: ${
                        result.redirects.length
                      }`}
                    />
                  ) : null}
                </Stack>
              </Alert>
              <ToolTextResult
                title={t('httpRequest.responseBody')}
                value={result.bodyText}
                extension={getBodyExtension(result.headers)}
                keepSpecialCharacters
                loading={loading}
              />
              <ToolTextResult
                title={t('httpRequest.responseHeaders')}
                value={formatJson(result.headers)}
                extension={'json'}
                keepSpecialCharacters
                loading={loading}
              />
              {result.redirects.length ? (
                <ToolTextResult
                  title={t('httpRequest.redirectChain')}
                  value={result.redirects.join('\n')}
                  keepSpecialCharacters
                  loading={loading}
                />
              ) : null}
            </>
          ) : (
            <ToolTextResult
              title={t('common.result')}
              value={rawResult}
              extension={'json'}
              keepSpecialCharacters
              loading={loading}
            />
          )}
        </Stack>
      }
    />
  );
}
