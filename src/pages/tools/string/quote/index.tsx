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
import { stringQuoter } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Quote text failed';

export default function Quote() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [leftQuote, setLeftQuote] = useState('"');
  const [rightQuote, setRightQuote] = useState('"');
  const [doubleQuotation, setDoubleQuotation] = useState(false);
  const [emptyQuoting, setEmptyQuoting] = useState(true);
  const [multiLine, setMultiLine] = useState(true);
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
        stringQuoter(
          input,
          leftQuote,
          rightQuote,
          doubleQuotation,
          emptyQuoting,
          multiLine
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [doubleQuotation, emptyQuoting, input, leftQuote, multiLine, rightQuote]);

  const output = error ? t('quote.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('quote.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={t('quote.leftQuoteLabel')}
                size="small"
                value={leftQuote}
                onChange={(event) => setLeftQuote(event.target.value)}
              />
              <TextField
                fullWidth
                label={t('quote.rightQuoteLabel')}
                size="small"
                value={rightQuote}
                onChange={(event) => setRightQuote(event.target.value)}
              />
            </Stack>
            <Stack spacing={0.5}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={doubleQuotation}
                    onChange={(event) =>
                      setDoubleQuotation(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('quote.allowDoubleQuotation')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={emptyQuoting}
                    onChange={(event) => setEmptyQuoting(event.target.checked)}
                    size="small"
                  />
                }
                label={t('quote.quoteEmptyLines')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={multiLine}
                    onChange={(event) => setMultiLine(event.target.checked)}
                    size="small"
                  />
                }
                label={t('quote.processAsMultiLine')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('quote.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
