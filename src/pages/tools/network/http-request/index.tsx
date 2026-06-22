import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { type JsonValue } from '@private-toolbox/core';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
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

type KeyValueRow = {
  [key: string]: string | boolean;
  id: string;
  enabled: boolean;
  key: string;
  value: string;
};

type RequestTab = 'params' | 'headers' | 'body' | 'settings';
type ResponseTab = 'body' | 'headers' | 'redirects' | 'raw';
type BodyType = 'none' | 'json' | 'text';

type HttpRequestHistoryValues = {
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[] | string;
  body: string;
  bodyType: BodyType;
  followRedirects: boolean;
  timeoutMs: number;
  maxResponseBytesKb: number;
};

type KeyValueEditorProps = {
  rows: KeyValueRow[];
  labels: {
    add: string;
    enabled: string;
    key: string;
    value: string;
    remove: string;
  };
  onChange: (rows: KeyValueRow[]) => void;
};

type ResponseTextPanelProps = {
  heading: string;
  value: string;
  extension: string;
  loading: boolean;
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

const createRow = (key = '', value = '', enabled = true): KeyValueRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  enabled,
  key,
  value
});

const cloneRows = (rows: KeyValueRow[]): KeyValueRow[] =>
  rows.map((row) => createRow(row.key, row.value, row.enabled));

const compactRows = (rows: KeyValueRow[]): KeyValueRow[] =>
  rows
    .filter((row) => row.key.trim() || row.value.trim())
    .map((row, index) => ({
      id: String(index),
      enabled: row.enabled,
      key: row.key,
      value: row.value
    }));

const headerTextToRows = (value: string): KeyValueRow[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Headers must be an object');
    }

    return Object.entries(parsed as Record<string, unknown>).map(
      ([key, item]) => createRow(key, String(item))
    );
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex <= 0) {
        throw new Error(`Invalid header line: ${line}`);
      }

      return createRow(
        line.slice(0, separatorIndex).trim(),
        line.slice(separatorIndex + 1).trim()
      );
    });
};

const normalizeHistoryRows = (
  value: KeyValueRow[] | string | undefined,
  fallback: KeyValueRow[]
): KeyValueRow[] => {
  if (Array.isArray(value)) return cloneRows(value);
  if (typeof value === 'string') return headerTextToRows(value);

  return cloneRows(fallback);
};

const rowsToRecord = (rows: KeyValueRow[]): Record<string, string> =>
  Object.fromEntries(
    rows
      .filter((row) => row.enabled && row.key.trim())
      .map((row) => [row.key.trim(), row.value])
  );

const hasHeader = (headers: Record<string, string>, name: string): boolean =>
  Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());

const buildRequestUrl = (inputUrl: string, params: KeyValueRow[]): string => {
  const activeParams = params.filter((row) => row.enabled && row.key.trim());
  if (activeParams.length === 0) return inputUrl;

  const target = new URL(inputUrl);
  activeParams.forEach((row) => {
    target.searchParams.append(row.key.trim(), row.value);
  });

  return target.toString();
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

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

const formatBytes = (bytes: number): string =>
  bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;

function KeyValueEditor({ rows, labels, onChange }: KeyValueEditorProps) {
  const updateRow = (
    id: string,
    patch: Partial<Pick<KeyValueRow, 'enabled' | 'key' | 'value'>>
  ) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <Stack spacing={1}>
      {rows.map((row) => (
        <Stack
          key={row.id}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ minWidth: 0 }}
        >
          <Checkbox
            size={'small'}
            checked={row.enabled}
            aria-label={labels.enabled}
            onChange={(event) =>
              updateRow(row.id, { enabled: event.target.checked })
            }
            sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
          />
          <TextField
            fullWidth
            size={'small'}
            label={labels.key}
            value={row.key}
            onChange={(event) => updateRow(row.id, { key: event.target.value })}
            sx={{ backgroundColor: 'background.paper' }}
          />
          <TextField
            fullWidth
            size={'small'}
            label={labels.value}
            value={row.value}
            onChange={(event) =>
              updateRow(row.id, { value: event.target.value })
            }
            sx={{ backgroundColor: 'background.paper' }}
          />
          <Tooltip title={labels.remove}>
            <IconButton
              size={'small'}
              aria-label={labels.remove}
              onClick={() => removeRow(row.id)}
              sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}
            >
              <DeleteOutlineRoundedIcon fontSize={'small'} />
            </IconButton>
          </Tooltip>
        </Stack>
      ))}
      <Button
        variant={'outlined'}
        size={'small'}
        startIcon={<AddRoundedIcon />}
        onClick={() => onChange([...rows, createRow()])}
        sx={{ alignSelf: 'flex-start' }}
      >
        {labels.add}
      </Button>
    </Stack>
  );
}

function ResponseTextPanel({
  heading,
  value,
  extension,
  loading
}: ResponseTextPanelProps) {
  const { t } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);

  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => showSnackBar(t('toolTextResult.copied'), 'success'))
      .catch((error) =>
        showSnackBar(t('toolTextResult.copyFailed', { error }), 'error')
      );
  };

  const handleDownload = () => {
    const blob = new Blob([value], {
      type: 'text/plain;charset=utf-8'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `private-toolbox-response.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Stack
        direction={'row'}
        spacing={1}
        alignItems={'center'}
        justifyContent={'space-between'}
        mb={1}
      >
        <Typography variant={'subtitle2'}>{heading}</Typography>
        <Stack direction={'row'} spacing={0.5}>
          <Tooltip title={t('resultFooter.download')}>
            <span>
              <IconButton
                size={'small'}
                aria-label={t('resultFooter.download')}
                disabled={!value || loading}
                onClick={handleDownload}
              >
                <FileDownloadRoundedIcon fontSize={'small'} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('resultFooter.copy')}>
            <span>
              <IconButton
                size={'small'}
                aria-label={t('resultFooter.copy')}
                disabled={!value || loading}
                onClick={handleCopy}
              >
                <ContentCopyRoundedIcon fontSize={'small'} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
      <TextField
        fullWidth
        multiline
        minRows={12}
        value={value}
        inputProps={{ readOnly: true, 'data-testid': 'text-result' }}
        sx={{
          backgroundColor: 'background.paper',
          '& textarea': {
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.55
          }
        }}
      />
    </Box>
  );
}

export default function HttpRequest() {
  const { t } = useTranslation('network');
  const defaultHeaders = [
    createRow('accept', 'application/json, text/plain, */*')
  ];
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [url, setUrl] = useState('https://example.com');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [params, setParams] = useState<KeyValueRow[]>(() => [createRow()]);
  const [headers, setHeaders] = useState<KeyValueRow[]>(() =>
    cloneRows(defaultHeaders)
  );
  const [bodyType, setBodyType] = useState<BodyType>('json');
  const [body, setBody] = useState('');
  const [followRedirects, setFollowRedirects] = useState(true);
  const [timeoutMs, setTimeoutMs] = useState(8000);
  const [maxResponseBytesKb, setMaxResponseBytesKb] = useState(1024);
  const [requestTab, setRequestTab] = useState<RequestTab>('params');
  const [responseTab, setResponseTab] = useState<ResponseTab>('body');
  const [result, setResult] = useState<HttpRequestResult | null>(null);
  const [rawResult, setRawResult] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    HttpHistoryEntry<HttpRequestHistoryValues>[]
  >(() => getHttpHistory<HttpRequestHistoryValues>('http.request'));
  const canSendBody = methodsWithBody.includes(method);

  const keyValueLabels = {
    add: t('httpRequest.addRow'),
    enabled: t('httpRequest.enabled'),
    key: t('httpRequest.key'),
    value: t('httpRequest.value'),
    remove: t('httpRequest.removeRow')
  };

  const getHistoryValues = (): HttpRequestHistoryValues => ({
    method,
    url,
    params: compactRows(params),
    headers: compactRows(headers),
    body,
    bodyType,
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
      const requestUrl = buildRequestUrl(url, params);
      const requestHeaders = rowsToRecord(headers);

      if (
        canSendBody &&
        bodyType === 'json' &&
        !hasHeader(requestHeaders, 'content-type')
      ) {
        requestHeaders['content-type'] = 'application/json';
      }
      if (
        canSendBody &&
        bodyType === 'text' &&
        !hasHeader(requestHeaders, 'content-type')
      ) {
        requestHeaders['content-type'] = 'text/plain; charset=utf-8';
      }

      const args: Record<string, JsonValue> = {
        url: requestUrl,
        method,
        headers: requestHeaders,
        followRedirects,
        timeoutMs,
        maxResponseBytes: Math.max(1, maxResponseBytesKb) * 1024
      };

      if (canSendBody && bodyType !== 'none' && body.trim()) {
        args.body = body;
      }

      setHistory(
        recordHttpHistory(
          'http.request',
          `${method} ${requestUrl}`,
          getHistoryValues()
        )
      );

      const response = await callApiTool('http.request', args, apiBaseUrl);
      setErrorText(getApiToolErrorText(response));

      if (response.ok) {
        const value = response.result as unknown as HttpRequestResult;
        setResult(value);
        setRawResult(formatJson(value));
        setResponseTab('body');
      } else {
        setRawResult(formatJson(response.error));
        setResponseTab('raw');
      }
    } catch (error) {
      const errorResult = toNetworkErrorResult(
        'HTTP_REQUEST_INPUT_ERROR',
        'Unable to run request',
        error
      );
      setErrorText(getApiToolErrorText(errorResult));
      setRawResult(formatJson(errorResult.error));
      setResponseTab('raw');
    } finally {
      setLoading(false);
    }
  };

  const applyHistory = (entry: HttpHistoryEntry<HttpRequestHistoryValues>) => {
    setMethod(entry.values.method);
    setUrl(entry.values.url);
    setParams(normalizeHistoryRows(entry.values.params, []));
    setHeaders(normalizeHistoryRows(entry.values.headers, defaultHeaders));
    setBody(entry.values.body);
    setBodyType(entry.values.bodyType ?? 'json');
    setFollowRedirects(entry.values.followRedirects);
    setTimeoutMs(entry.values.timeoutMs ?? 8000);
    setMaxResponseBytesKb(entry.values.maxResponseBytesKb ?? 1024);
  };

  const clearHistory = () => {
    clearHttpHistory('http.request');
    setHistory([]);
  };

  const renderResponse = () => {
    if (!result) {
      const responseHeading =
        responseTab === 'headers'
          ? t('httpRequest.responseHeaders')
          : responseTab === 'redirects'
            ? t('httpRequest.redirectChain')
            : responseTab === 'raw'
              ? t('httpRequest.responseRaw')
              : t('httpRequest.responseBody');

      return (
        <ResponseTextPanel
          heading={responseHeading}
          value={rawResult}
          extension={'json'}
          loading={loading}
        />
      );
    }

    if (responseTab === 'headers') {
      return (
        <ResponseTextPanel
          heading={t('httpRequest.responseHeaders')}
          value={formatJson(result.headers)}
          extension={'json'}
          loading={loading}
        />
      );
    }

    if (responseTab === 'redirects') {
      return (
        <ResponseTextPanel
          heading={t('httpRequest.redirectChain')}
          value={result.redirects.join('\n')}
          extension={'txt'}
          loading={loading}
        />
      );
    }

    if (responseTab === 'raw') {
      return (
        <ResponseTextPanel
          heading={t('httpRequest.responseRaw')}
          value={rawResult}
          extension={'json'}
          loading={loading}
        />
      );
    }

    return (
      <ResponseTextPanel
        heading={t('httpRequest.responseBody')}
        value={result.bodyText}
        extension={getBodyExtension(result.headers)}
        loading={loading}
      />
    );
  };

  return (
    <Stack id={'tool'} spacing={2}>
      <Paper
        variant={'outlined'}
        sx={{ p: 1.5, borderRadius: 1, backgroundColor: 'background.default' }}
      >
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <FormControl
              fullWidth
              size={'small'}
              sx={{ flex: { sm: '0 0 132px' } }}
            >
              <InputLabel>{t('httpRequest.method')}</InputLabel>
              <Select
                label={t('httpRequest.method')}
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as HttpMethod)
                }
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
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void run();
                }
              }}
              sx={{ backgroundColor: 'background.paper' }}
            />
            <Button
              variant={'contained'}
              startIcon={<SendRoundedIcon />}
              disabled={loading}
              onClick={run}
              sx={{ flex: { sm: '0 0 112px' } }}
            >
              {t('httpRequest.send')}
            </Button>
          </Stack>

          <Tabs
            value={requestTab}
            onChange={(_, value: RequestTab) => setRequestTab(value)}
            variant={'scrollable'}
            scrollButtons={'auto'}
            allowScrollButtonsMobile
            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
          >
            <Tab value={'params'} label={t('httpRequest.params')} />
            <Tab value={'headers'} label={t('httpRequest.headers')} />
            <Tab value={'body'} label={t('httpRequest.body')} />
            <Tab value={'settings'} label={t('httpRequest.settings')} />
          </Tabs>

          <Box>
            {requestTab === 'params' ? (
              <KeyValueEditor
                rows={params}
                labels={keyValueLabels}
                onChange={setParams}
              />
            ) : null}
            {requestTab === 'headers' ? (
              <KeyValueEditor
                rows={headers}
                labels={keyValueLabels}
                onChange={setHeaders}
              />
            ) : null}
            {requestTab === 'body' ? (
              <Stack spacing={1.5}>
                <FormControl fullWidth size={'small'}>
                  <InputLabel>{t('httpRequest.bodyType')}</InputLabel>
                  <Select
                    label={t('httpRequest.bodyType')}
                    value={bodyType}
                    disabled={!canSendBody}
                    onChange={(event) =>
                      setBodyType(event.target.value as BodyType)
                    }
                    sx={{ backgroundColor: 'background.paper' }}
                  >
                    <MenuItem value={'none'}>
                      {t('httpRequest.bodyTypes.none')}
                    </MenuItem>
                    <MenuItem value={'json'}>
                      {t('httpRequest.bodyTypes.json')}
                    </MenuItem>
                    <MenuItem value={'text'}>
                      {t('httpRequest.bodyTypes.text')}
                    </MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  minRows={9}
                  label={t('httpRequest.body')}
                  value={body}
                  disabled={!canSendBody || bodyType === 'none'}
                  onChange={(event) => setBody(event.target.value)}
                  sx={{ backgroundColor: 'background.paper' }}
                />
              </Stack>
            ) : null}
            {requestTab === 'settings' ? (
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    size={'small'}
                    type={'number'}
                    label={t('httpRequest.timeoutMs')}
                    value={timeoutMs}
                    onChange={(event) =>
                      setTimeoutMs(
                        Math.max(100, Number(event.target.value) || 100)
                      )
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
                </Stack>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={followRedirects}
                      onChange={(event) =>
                        setFollowRedirects(event.target.checked)
                      }
                    />
                  }
                  label={t('httpRequest.followRedirects')}
                />
                <TextField
                  fullWidth
                  size={'small'}
                  label={t('common.apiBaseUrl')}
                  value={apiBaseUrl}
                  onChange={(event) => setApiBaseUrlState(event.target.value)}
                  sx={{ backgroundColor: 'background.paper' }}
                />
              </Stack>
            ) : null}
          </Box>
        </Stack>
      </Paper>

      <NetworkHistoryChips
        clearLabel={t('common.clearHistory')}
        entries={history}
        title={t('common.history')}
        onApply={applyHistory}
        onClear={clearHistory}
      />

      <Paper
        variant={'outlined'}
        sx={{ p: 1.5, borderRadius: 1, backgroundColor: 'background.default' }}
      >
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent={'space-between'}
          >
            <Typography variant={'subtitle1'} fontWeight={700}>
              {t('httpRequest.response')}
            </Typography>
            {result ? (
              <Stack direction={'row'} spacing={1} flexWrap={'wrap'} useFlexGap>
                <Chip
                  size={'small'}
                  color={getResponseSeverity(result.status)}
                  label={`${result.status} ${result.statusText}`.trim()}
                />
                <Chip size={'small'} label={result.method} />
                <Chip
                  size={'small'}
                  label={`${result.responseTimeMs ?? 0} ms`}
                />
                <Chip size={'small'} label={formatBytes(result.bodyBytes)} />
                {result.redirected ? (
                  <Chip
                    size={'small'}
                    label={`${t('httpRequest.redirects')}: ${
                      result.redirects.length
                    }`}
                  />
                ) : null}
              </Stack>
            ) : null}
          </Stack>

          {errorText && <Alert severity={'error'}>{errorText}</Alert>}

          <Tabs
            value={responseTab}
            onChange={(_, value: ResponseTab) => setResponseTab(value)}
            variant={'scrollable'}
            scrollButtons={'auto'}
            allowScrollButtonsMobile
            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
          >
            <Tab value={'body'} label={t('httpRequest.responseBody')} />
            <Tab value={'headers'} label={t('httpRequest.responseHeaders')} />
            <Tab value={'redirects'} label={t('httpRequest.redirects')} />
            <Tab value={'raw'} label={t('httpRequest.responseRaw')} />
          </Tabs>

          {renderResponse()}
        </Stack>
      </Paper>
    </Stack>
  );
}
