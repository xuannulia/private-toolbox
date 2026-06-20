import { Box, MenuItem, Stack, TextField } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getJsonHeaders } from '@utils/json';
import { sortJson } from './service';
import { type mode as SortMode, type order as SortOrder } from './types';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Invalid JSON sort input';

export default function SortJson() {
  const { t } = useTranslation('json');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<SortMode>('key');
  const [key, setKey] = useState('');
  const [order, setOrder] = useState<SortOrder>('asc');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const keys = useMemo(() => getJsonHeaders(input), [input]);

  useEffect(() => {
    if (!input.trim()) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(sortJson(input, { mode, key, order }));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, key, mode, order]);

  const output = error ? t('sortJson.invalidInput', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolCodeInput
              title={t('sortJson.inputTitle')}
              value={input}
              onChange={setInput}
              language="json"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select
                fullWidth
                size="small"
                label={t('sortJson.options.mode')}
                value={mode}
                onChange={(event) => {
                  const nextMode = event.target.value as SortMode;
                  setMode(nextMode);
                  if (nextMode === 'key') setKey('');
                }}
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="key">
                  {t('sortJson.options.sortByKey')}
                </MenuItem>
                <MenuItem value="value">
                  {t('sortJson.options.sortByValue')}
                </MenuItem>
              </TextField>

              {mode === 'value' && (
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={t('sortJson.options.key')}
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  sx={{ backgroundColor: 'background.paper' }}
                >
                  <MenuItem value="">
                    {t('sortJson.options.selectKey')}
                  </MenuItem>
                  {keys.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                select
                fullWidth
                size="small"
                label={t('sortJson.options.order')}
                value={order}
                onChange={(event) => setOrder(event.target.value as SortOrder)}
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="asc">
                  {t('sortJson.options.ascending')}
                </MenuItem>
                <MenuItem value="desc">
                  {t('sortJson.options.descending')}
                </MenuItem>
              </TextField>
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="json"
            keepSpecialCharacters
            monospace
            title={t('sortJson.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
