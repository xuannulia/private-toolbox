import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { beautifyXml } from './service';

export default function XmlBeautifier() {
  const { t } = useTranslation('xml');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(input.trim() ? beautifyXml(input, {}) : '');
  }, [input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('xmlBeautifier.inputTitle')}
            value={input}
            onChange={setInput}
          />
        }
        result={
          <ToolTextResult
            disabled={!result}
            extension="xml"
            keepSpecialCharacters
            monospace
            title={t('xmlBeautifier.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
