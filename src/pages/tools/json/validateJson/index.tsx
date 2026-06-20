import { Box } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateJson } from './service';

export default function ValidateJson() {
  const { t } = useTranslation('json');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!input.trim()) {
      setResult('');
      return;
    }

    const { valid, error } = validateJson(input);
    setResult(
      valid
        ? t('validateJson.validJson')
        : t('validateJson.invalidJson', { error })
    );
  }, [input, t]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('validateJson.inputTitle')}
            value={input}
            onChange={setInput}
            language="json"
          />
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            title={t('validateJson.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
