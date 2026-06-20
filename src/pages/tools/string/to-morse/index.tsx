import { Box, Stack, TextField } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { compute } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Morse conversion failed';

export default function ToMorse() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [dotSymbol, setDotSymbol] = useState('.');
  const [dashSymbol, setDashSymbol] = useState('-');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(compute(input, dotSymbol, dashSymbol));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [dashSymbol, dotSymbol, input]);

  const output = error ? t('toMorse.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('toMorse.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={t('toMorse.dotSymbolLabel')}
                size="small"
                value={dotSymbol}
                onChange={(event) => setDotSymbol(event.target.value)}
              />
              <TextField
                fullWidth
                label={t('toMorse.dashSymbolLabel')}
                size="small"
                value={dashSymbol}
                onChange={(event) => setDashSymbol(event.target.value)}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('toMorse.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
