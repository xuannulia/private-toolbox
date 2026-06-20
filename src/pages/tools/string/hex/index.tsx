import {
  Box,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { convertHex, HexMode } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Hex conversion failed';

export default function HexTool() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<HexMode>('encode');
  const [uppercase, setUppercase] = useState(false);
  const [separator, setSeparator] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setResult(convertHex(input, { mode, uppercase, separator }));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, mode, separator, uppercase]);

  const output = error ? t('hex.invalidInput', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_, nextMode: HexMode | null) => {
                if (nextMode) {
                  setMode(nextMode);
                }
              }}
            >
              <ToggleButton value="encode">{t('hex.encode')}</ToggleButton>
              <ToggleButton value="decode">{t('hex.decode')}</ToggleButton>
            </ToggleButtonGroup>
            <ToolTextInput
              title={t('hex.inputTitle')}
              value={input}
              onChange={setInput}
            />
            {mode === 'encode' && (
              <Stack spacing={2}>
                <FormControlLabel
                  sx={{ m: 0 }}
                  control={
                    <Switch
                      checked={uppercase}
                      onChange={(event) => setUppercase(event.target.checked)}
                      size="small"
                    />
                  }
                  label={t('hex.uppercase')}
                />
                <TextField
                  label={t('hex.separatorLabel')}
                  size="small"
                  value={separator}
                  onChange={(event) => setSeparator(event.target.value)}
                />
              </Stack>
            )}
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('hex.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
