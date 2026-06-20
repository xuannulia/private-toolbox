import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CompactToggle,
  OptionStack
} from '../TimeToolControls';
import { truncateClockTime } from './service';

type TruncateMode = 'seconds' | 'minutes-seconds';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Truncate clock time failed';

export default function TruncateClockTime() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<TruncateMode>('seconds');
  const [zeroPrint, setZeroPrint] = useState(false);
  const [zeroPadding, setZeroPadding] = useState(true);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setResult(
        truncateClockTime(input, mode === 'seconds', zeroPrint, zeroPadding)
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, mode, zeroPadding, zeroPrint]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('truncateClockTime.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <OptionStack>
              <CompactToggle
                value={mode}
                options={[
                  {
                    label: t('truncateClockTime.truncateOnlySeconds'),
                    value: 'seconds'
                  },
                  {
                    label: t('truncateClockTime.truncateMinutesAndSeconds'),
                    value: 'minutes-seconds'
                  }
                ]}
                onChange={setMode}
              />
              <CompactCheckbox
                checked={zeroPrint}
                label={t('truncateClockTime.zeroPrintTruncatedParts')}
                onChange={setZeroPrint}
              />
              <CompactCheckbox
                checked={zeroPadding}
                label={t('truncateClockTime.useZeroPadding')}
                onChange={setZeroPadding}
              />
            </OptionStack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('truncateClockTime.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
