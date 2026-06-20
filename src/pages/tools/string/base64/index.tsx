import { Box, MenuItem, Stack, TextField } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { base64 } from './service';
import { InitialValuesType } from './types';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Base64 conversion failed';

export default function Base64() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<InitialValuesType['mode']>('encode');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input.length) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(base64(input, mode === 'encode'));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, mode]);

  const output = error ? t('base64.invalidInput', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('base64.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <TextField
              select
              fullWidth
              size="small"
              label={t('base64.modeTitle')}
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as InitialValuesType['mode'])
              }
              sx={{ backgroundColor: 'background.paper' }}
            >
              <MenuItem value="encode">{t('base64.encode')}</MenuItem>
              <MenuItem value="decode">{t('base64.decode')}</MenuItem>
            </TextField>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('base64.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
