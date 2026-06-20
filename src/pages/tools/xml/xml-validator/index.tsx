import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateXml } from './service';

export default function XmlValidator() {
  const { t } = useTranslation('xml');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(input.trim() ? validateXml(input, {}) : '');
  }, [input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('xmlValidator.inputTitle')}
            value={input}
            onChange={setInput}
            placeholder={t('xmlValidator.placeholder')}
          />
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('xmlValidator.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
