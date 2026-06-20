import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractSubstring } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Extract substring failed';

export default function ExtractSubstring() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [start, setStart] = useState('1');
  const [length, setLength] = useState('5');
  const [multiLine, setMultiLine] = useState(false);
  const [reverse, setReverse] = useState(false);
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
        extractSubstring(
          input,
          Number.parseInt(start, 10),
          Number.parseInt(length, 10),
          multiLine,
          reverse
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, length, multiLine, reverse, start]);

  const output = error
    ? t('extractSubstring.errorFallback', { error })
    : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('extractSubstring.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={t('extractSubstring.startLabel')}
                size="small"
                type="number"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
              <TextField
                fullWidth
                label={t('extractSubstring.lengthLabel')}
                size="small"
                type="number"
                value={length}
                onChange={(event) => setLength(event.target.value)}
              />
            </Stack>
            <Stack spacing={0.5}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={multiLine}
                    onChange={(event) => setMultiLine(event.target.checked)}
                    size="small"
                  />
                }
                label={t('extractSubstring.multiLine')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={reverse}
                    onChange={(event) => setReverse(event.target.checked)}
                    size="small"
                  />
                }
                label={t('extractSubstring.reverse')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('extractSubstring.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
