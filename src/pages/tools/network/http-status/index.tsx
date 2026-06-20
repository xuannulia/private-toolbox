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

type HttpStatusMethod = 'HEAD' | 'GET';

const methods: HttpStatusMethod[] = ['HEAD', 'GET'];

type HttpStatusHistoryValues = {
  method: HttpStatusMethod;
  url: string;
  followRedirects: boolean;
};

const formatResult = (value: unknown): string => JSON.stringify(value, null, 2);

export default function HttpStatus({ title }: ToolComponentProps) {
  const { t } = useTranslation('network');
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [url, setUrl] = useState('https://example.com');
  const [method, setMethod] = useState<HttpStatusMethod>('HEAD');
  const [followRedirects, setFollowRedirects] = useState(true);
  const [result, setResult] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    HttpHistoryEntry<HttpStatusHistoryValues>[]
  >(() => getHttpHistory<HttpStatusHistoryValues>('http.status'));

  const getHistoryValues = (): HttpStatusHistoryValues => ({
    method,
    url,
    followRedirects
  });

  const run = async () => {
    setLoading(true);
    setErrorText(null);
    setApiBaseUrl(apiBaseUrl);

    try {
      setHistory(
        recordHttpHistory('http.status', `${method} ${url}`, getHistoryValues())
      );

      const response = await callApiTool(
        'http.status',
        {
          url,
          method,
          followRedirects
        } satisfies Record<string, JsonValue>,
        apiBaseUrl
      );
      setErrorText(getApiToolErrorText(response));
      setResult(formatResult(response.ok ? response.result : response.error));
    } catch (error) {
      const errorResult = toNetworkErrorResult(
        'HTTP_STATUS_INPUT_ERROR',
        'Unable to check HTTP status',
        error
      );
      setErrorText(getApiToolErrorText(errorResult));
      setResult(formatResult(errorResult.error));
    } finally {
      setLoading(false);
    }
  };

  const applyHistory = (entry: HttpHistoryEntry<HttpStatusHistoryValues>) => {
    setMethod(entry.values.method);
    setUrl(entry.values.url);
    setFollowRedirects(entry.values.followRedirects);
  };

  const clearHistory = () => {
    clearHttpHistory('http.status');
    setHistory([]);
  };

  const input = (
    <Box>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size={'small'}
            label={t('httpStatus.url')}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            sx={{ backgroundColor: 'background.paper' }}
          />
          <FormControl
            fullWidth
            size={'small'}
            sx={{ flex: { sm: '0 0 130px' } }}
          >
            <InputLabel>{t('httpStatus.method')}</InputLabel>
            <Select
              label={t('httpStatus.method')}
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as HttpStatusMethod)
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
        </Stack>
        <FormControlLabel
          control={
            <Checkbox
              checked={followRedirects}
              onChange={(event) => setFollowRedirects(event.target.checked)}
            />
          }
          label={t('httpStatus.followRedirects')}
        />
        <NetworkActionBar
          apiBaseUrl={apiBaseUrl}
          apiBaseUrlLabel={t('common.apiBaseUrl')}
          loading={loading}
          runLabel={t('httpStatus.check')}
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
