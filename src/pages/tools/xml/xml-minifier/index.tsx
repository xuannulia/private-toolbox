import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { minifyXml } from './service';

export default function XmlMinifier() {
  const { t } = useTranslation('xml');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(input.trim() ? minifyXml(input, {}) : '');
  }, [input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('xmlMinifier.inputTitle')}
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
            title={t('xmlMinifier.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
