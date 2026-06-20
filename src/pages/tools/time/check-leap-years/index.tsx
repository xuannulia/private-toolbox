import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkLeapYear } from './service';

export default function CheckLeapYears() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(checkLeapYear(input));
  }, [input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('checkLeapYears.inputTitle')}
            value={input}
            onChange={setInput}
          />
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('checkLeapYears.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
