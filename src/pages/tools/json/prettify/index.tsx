import { Box, MenuItem, Stack, TextField } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { beautifyJson } from './service';
import JsonResultView from './JsonResultView';

type IndentationType = 'tab' | 'space';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Invalid JSON string';

export default function PrettifyJson() {
  const { t } = useTranslation('json');
  const [input, setInput] = useState('');
  const [indentationType, setIndentationType] =
    useState<IndentationType>('space');
  const [spacesCount, setSpacesCount] = useState('2');
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
      setResult(beautifyJson(input, indentationType, normalizedSpacesCount));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [indentationType, input, spacesCount]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolCodeInput
              title={t('prettify.inputTitle')}
              value={input}
              onChange={setInput}
              language="json"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select
                fullWidth
                size="small"
                label={t('prettify.indentation')}
                value={indentationType}
                onChange={(event) =>
                  setIndentationType(event.target.value as IndentationType)
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="space">{t('prettify.useSpaces')}</MenuItem>
                <MenuItem value="tab">{t('prettify.useTabs')}</MenuItem>
              </TextField>
              {indentationType === 'space' && (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={t('prettify.spacesCount')}
                  value={spacesCount}
                  onChange={(event) => setSpacesCount(event.target.value)}
                  inputProps={{ min: 1, max: 8, step: 1 }}
                  sx={{ backgroundColor: 'background.paper' }}
                />
              )}
            </Stack>
          </Stack>
        }
        result={
          <JsonResultView
            title={t('prettify.resultTitle')}
            value={result}
            error={error}
          />
        }
      />
    </Box>
  );
}
