import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactCheckbox } from '../TimeToolControls';
import { convertSecondsToTime } from './service';

export default function SecondsToTime() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [padding, setPadding] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(convertSecondsToTime(input, padding));
  }, [input, padding]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('convertSecondsToTime.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <CompactCheckbox
              checked={padding}
              label={t('convertSecondsToTime.addPadding')}
              onChange={setPadding}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('convertSecondsToTime.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
