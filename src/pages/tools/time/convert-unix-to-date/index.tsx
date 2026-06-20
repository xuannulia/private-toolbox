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
import { UnixDateConverter } from './service';
import InitialValuesType from './types';

export default function ConvertUnixToDate() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<InitialValuesType['mode']>('unix-to-date');
  const [useLocalTime, setUseLocalTime] = useState(false);
  const [withLabel, setWithLabel] = useState(true);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(UnixDateConverter(input, { mode, useLocalTime, withLabel }));
  }, [input, mode, useLocalTime, withLabel]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('convertUnixToDate.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <OptionStack>
              <CompactToggle
                value={mode}
                options={[
                  {
                    label: t('convertUnixToDate.unix-to-date'),
                    value: 'unix-to-date'
                  },
                  {
                    label: t('convertUnixToDate.date-to-unix'),
                    value: 'date-to-unix'
                  }
                ]}
                onChange={setMode}
              />
              <CompactToggle
                value={useLocalTime ? 'local' : 'utc'}
                options={[
                  { label: t('convertUnixToDate.useUTC'), value: 'utc' },
                  {
                    label: t('convertUnixToDate.useLocalTime'),
                    value: 'local'
                  }
                ]}
                onChange={(value) => setUseLocalTime(value === 'local')}
              />
              {mode === 'unix-to-date' && !useLocalTime && (
                <CompactCheckbox
                  checked={withLabel}
                  label={t('convertUnixToDate.addUtcLabel')}
                  onChange={setWithLabel}
                />
              )}
            </OptionStack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('convertUnixToDate.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
