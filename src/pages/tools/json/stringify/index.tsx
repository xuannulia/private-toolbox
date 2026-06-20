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
import { stringifyJson } from './service';

type IndentationType = 'tab' | 'space';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Invalid object or JSON input';

export default function StringifyJson() {
  const { t } = useTranslation('json');
  const [input, setInput] = useState('');
  const [indentationType, setIndentationType] =
    useState<IndentationType>('space');
  const [spacesCount, setSpacesCount] = useState('2');
  const [escapeHtml, setEscapeHtml] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input.trim()) {
      setResult('');
      setError('');
      return;
    }

    try {
      const normalizedSpacesCount =
        spacesCount.trim() === '' ? 2 : Number(spacesCount);
      setResult(
        stringifyJson(input, indentationType, normalizedSpacesCount, escapeHtml)
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [escapeHtml, indentationType, input, spacesCount]);

  const output = error ? t('stringify.invalidInput', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolCodeInput
              title={t('stringify.inputTitle')}
              value={input}
              onChange={setInput}
              language="javascript"
            />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <TextField
                select
                fullWidth
                size="small"
                label={t('stringify.indentation')}
                value={indentationType}
                onChange={(event) =>
                  setIndentationType(event.target.value as IndentationType)
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="space">{t('stringify.useSpaces')}</MenuItem>
                <MenuItem value="tab">{t('stringify.useTabs')}</MenuItem>
              </TextField>
              {indentationType === 'space' && (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={t('stringify.spacesCount')}
                  value={spacesCount}
                  onChange={(event) => setSpacesCount(event.target.value)}
                  inputProps={{ min: 0, max: 8, step: 1 }}
                  sx={{ backgroundColor: 'background.paper' }}
                />
              )}
              <FormControlLabel
                sx={{ m: 0, minWidth: 160 }}
                control={
                  <Switch
                    checked={escapeHtml}
                    onChange={(event) => setEscapeHtml(event.target.checked)}
                    size="small"
                  />
                }
                label={t('stringify.escapeHtml')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="json"
            keepSpecialCharacters
            monospace
            title={t('stringify.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
