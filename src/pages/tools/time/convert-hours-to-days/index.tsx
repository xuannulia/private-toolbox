import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactCheckbox, CompactTextField } from '../TimeToolControls';
import { convertHoursToDays } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Convert hours to days failed';

export default function ConvertHoursToDays() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [accuracy, setAccuracy] = useState('1');
  const [withDaysName, setWithDaysName] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setResult(convertHoursToDays(input, accuracy, withDaysName));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [accuracy, input, withDaysName]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('convertHoursToDays.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <CompactTextField
              label={t('convertHoursToDays.accuracyLabel')}
              value={accuracy}
              onChange={setAccuracy}
            />
            <CompactCheckbox
              checked={withDaysName}
              label={t('convertHoursToDays.addDaysName')}
              onChange={setWithDaysName}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('convertHoursToDays.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
