import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactCheckbox } from '../TimeToolControls';
import { convertDaysToHours } from './service';

export default function ConvertDaysToHours() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [withHoursName, setWithHoursName] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(convertDaysToHours(input, withHoursName));
  }, [input, withHoursName]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('convertDaysToHours.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <CompactCheckbox
              checked={withHoursName}
              label={t('convertDaysToHours.addHoursName')}
              onChange={setWithHoursName}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('convertDaysToHours.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
