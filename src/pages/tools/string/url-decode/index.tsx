import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { decodeString } from './service';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'URL decode failed';

export default function DecodeString() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input.length) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(decodeString(input));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input]);

  const output = error ? t('urlDecode.invalidInput', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('urlDecode.inputTitle')}
            value={input}
            onChange={setInput}
          />
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('urlDecode.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
