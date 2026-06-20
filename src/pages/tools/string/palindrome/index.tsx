import {
  Box,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { replaceSpecialCharacters } from '@utils/string';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { palindromeList, SplitOperatorType } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Palindrome check failed';

export default function Palindrome() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<SplitOperatorType>('symbol');
  const [symbolValue, setSymbolValue] = useState(' ');
  const [regexValue, setRegexValue] = useState('\\s+');
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
        palindromeList(
          mode,
          input,
          mode === 'symbol' ? replaceSpecialCharacters(symbolValue) : regexValue
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, mode, regexValue, symbolValue]);

  const output = error ? t('palindrome.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_, nextMode: SplitOperatorType | null) => {
                if (nextMode) {
                  setMode(nextMode);
                }
              }}
            >
              <ToggleButton value="symbol">
                {t('palindrome.symbolMode')}
              </ToggleButton>
              <ToggleButton value="regex">
                {t('palindrome.regexMode')}
              </ToggleButton>
            </ToggleButtonGroup>
            <ToolTextInput
              title={t('palindrome.inputTitle')}
              value={input}
              onChange={setInput}
            />
            {mode === 'symbol' ? (
              <TextField
                label={t('palindrome.separatorLabel')}
                size="small"
                value={symbolValue}
                onChange={(event) => setSymbolValue(event.target.value)}
              />
            ) : (
              <TextField
                label={t('palindrome.regexLabel')}
                size="small"
                value={regexValue}
                onChange={(event) => setRegexValue(event.target.value)}
              />
            )}
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('palindrome.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
