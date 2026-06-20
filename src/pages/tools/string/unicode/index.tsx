import {
  Box,
  FormControlLabel,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { unicode } from './service';
import { InitialValuesType } from './types';

export default function Unicode() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<InitialValuesType['mode']>('encode');
  const [uppercase, setUppercase] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(unicode(input, { mode, uppercase }));
  }, [input, mode, uppercase]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_, nextMode: InitialValuesType['mode'] | null) => {
                if (nextMode) {
                  setMode(nextMode);
                }
              }}
            >
              <ToggleButton value="encode">{t('unicode.encode')}</ToggleButton>
              <ToggleButton value="decode">{t('unicode.decode')}</ToggleButton>
            </ToggleButtonGroup>
            <ToolTextInput
              title={t('unicode.inputTitle')}
              value={input}
              onChange={setInput}
            />
            {mode === 'encode' && (
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={uppercase}
                    onChange={(event) => setUppercase(event.target.checked)}
                    size="small"
                  />
                }
                label={t('unicode.uppercase')}
              />
            )}
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('unicode.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
