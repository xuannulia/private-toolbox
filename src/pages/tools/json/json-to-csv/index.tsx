import {
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField
} from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { convertJsonToCsv } from './service';
import { InitialValuesType } from './types';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Invalid JSON input';

export default function JsonToCsv() {
  const { t } = useTranslation('json');
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [quoteStrings, setQuoteStrings] =
    useState<InitialValuesType['quoteStrings']>('auto');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input.trim()) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(
        convertJsonToCsv(input, {
          delimiter,
          includeHeaders,
          quoteStrings
        })
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [delimiter, includeHeaders, input, quoteStrings]);

  const output = error ? t('jsonToCsv.invalidInput', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolCodeInput
              title={t('jsonToCsv.inputTitle')}
              value={input}
              onChange={setInput}
              language="json"
            />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <TextField
                fullWidth
                size="small"
                label={t('jsonToCsv.delimiterOption')}
                value={delimiter}
                onChange={(event) => setDelimiter(event.target.value)}
                sx={{ backgroundColor: 'background.paper' }}
              />
              <TextField
                select
                fullWidth
                size="small"
                label={t('jsonToCsv.quotingOption')}
                value={quoteStrings}
                onChange={(event) =>
                  setQuoteStrings(
                    event.target.value as InitialValuesType['quoteStrings']
                  )
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="auto">
                  {t('jsonToCsv.options.autoQuote.label')}
                </MenuItem>
                <MenuItem value="always">
                  {t('jsonToCsv.options.alwaysQuote.label')}
                </MenuItem>
              </TextField>
              <FormControlLabel
                sx={{ m: 0, minWidth: 160 }}
                control={
                  <Switch
                    checked={includeHeaders}
                    onChange={(event) =>
                      setIncludeHeaders(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('jsonToCsv.options.header.label')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="csv"
            keepSpecialCharacters
            monospace
            title={t('jsonToCsv.outputTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
