import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { convertTimetoSeconds } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Convert time to seconds failed';

export default function TimeToSeconds() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setResult(convertTimetoSeconds(input));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('convertTimeToSeconds.inputTitle')}
            value={input}
            onChange={setInput}
          />
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('convertTimeToSeconds.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
