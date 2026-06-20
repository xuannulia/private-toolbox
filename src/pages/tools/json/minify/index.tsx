import { Box } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { minifyJson } from './service';

export default function MinifyJson() {
  const { t } = useTranslation('json');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input.trim()) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(minifyJson(input));
      setError('');
    } catch {
      setResult('');
      setError(t('minify.invalidJson'));
    }
  }, [input, t]);

  const output = error || result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('minify.inputTitle')}
            value={input}
            onChange={setInput}
            language="json"
          />
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="json"
            keepSpecialCharacters
            monospace
            title={t('minify.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
