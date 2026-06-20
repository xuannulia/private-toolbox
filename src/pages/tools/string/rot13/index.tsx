import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rot13 } from './service';

export default function Rot13() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(input ? rot13(input) : '');
  }, [input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('rot13.inputTitle')}
            value={input}
            onChange={setInput}
          />
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('rot13.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
