import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { censorText } from './service';

type CensorMode = 'symbol' | 'word';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Censor text failed';

export default function CensorText() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [wordsToCensor, setWordsToCensor] = useState('');
  const [mode, setMode] = useState<CensorMode>('symbol');
  const [censorSymbol, setCensorSymbol] = useState('█');
  const [eachLetter, setEachLetter] = useState(true);
  const [censorWord, setCensorWord] = useState('CENSORED');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(
        censorText(input, {
          wordsToCensor,
          censoredBySymbol: mode === 'symbol',
          censorSymbol,
          eachLetter,
          censorWord
        })
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [censorSymbol, censorWord, eachLetter, input, mode, wordsToCensor]);

  const output = error ? t('censor.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_, nextMode: CensorMode | null) => {
                if (nextMode) {
                  setMode(nextMode);
                }
              }}
            >
              <ToggleButton value="symbol">
                {t('censor.symbolMode')}
              </ToggleButton>
              <ToggleButton value="word">{t('censor.wordMode')}</ToggleButton>
            </ToggleButtonGroup>
            <ToolTextInput
              title={t('censor.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <TextField
              fullWidth
              label={t('censor.wordsLabel')}
              multiline
              rows={3}
              value={wordsToCensor}
              onChange={(event) => setWordsToCensor(event.target.value)}
            />
            {mode === 'symbol' ? (
              <Stack spacing={1.5}>
                <TextField
                  label={t('censor.symbolLabel')}
                  size="small"
                  value={censorSymbol}
                  onChange={(event) => setCensorSymbol(event.target.value)}
                />
                <FormControlLabel
                  sx={{ m: 0 }}
                  control={
                    <Checkbox
                      checked={eachLetter}
                      onChange={(event) => setEachLetter(event.target.checked)}
                      size="small"
                    />
                  }
                  label={t('censor.eachLetter')}
                />
              </Stack>
            ) : (
              <TextField
                label={t('censor.replacementLabel')}
                size="small"
                value={censorWord}
                onChange={(event) => setCensorWord(event.target.value)}
              />
            )}
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('censor.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
