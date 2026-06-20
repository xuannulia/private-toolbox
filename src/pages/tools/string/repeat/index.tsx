import { Box, Stack, TextField } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { replaceSpecialCharacters } from '@utils/string';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initialValues } from './initialValues';
import { repeatText } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Repeat text failed';

export default function RepeatText() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [repeatAmount, setRepeatAmount] = useState(initialValues.repeatAmount);
  const [delimiter, setDelimiter] = useState(initialValues.delimiter);
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
        repeatText(
          {
            ...initialValues,
            repeatAmount,
            delimiter: replaceSpecialCharacters(delimiter)
          },
          input
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [delimiter, input, repeatAmount]);

  const output = error ? t('repeat.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('repeat.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <TextField
              label={t('repeat.repeatAmountLabel')}
              size="small"
              type="number"
              value={repeatAmount}
              onChange={(event) => setRepeatAmount(event.target.value)}
            />
            <TextField
              label={t('repeat.delimiterPlaceholder')}
              size="small"
              value={delimiter}
              onChange={(event) => setDelimiter(event.target.value)}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('repeat.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
