import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactTextField } from '../TimeToolControls';
import { convertTimeToDecimal } from './service';

export default function ConvertTimeToDecimal() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [decimalPlaces, setDecimalPlaces] = useState('6');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(convertTimeToDecimal(input, { decimalPlaces }));
  }, [decimalPlaces, input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('convertTimeToDecimal.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <CompactTextField
              label={t('convertTimeToDecimal.decimalPlacesLabel')}
              value={decimalPlaces}
              onChange={setDecimalPlaces}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('convertTimeToDecimal.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
