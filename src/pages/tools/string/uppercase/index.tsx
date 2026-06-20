import { Box, MenuItem, Stack, TextField } from '@mui/material';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { changeTextCase, type TextCaseMode } from '@private-toolbox/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Text case conversion failed';

export default function Uppercase() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<TextCaseMode>('uppercase');
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(changeTextCase(input, mode).output);
    } catch (error) {
      setResult(formatError(error));
    }
  }, [input, mode]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('uppercase.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <TextField
              select
              fullWidth
              size="small"
              label={t('uppercase.modeTitle')}
              value={mode}
              onChange={(event) => setMode(event.target.value as TextCaseMode)}
              sx={{ backgroundColor: 'background.paper' }}
            >
              <MenuItem value="uppercase">{t('uppercase.uppercase')}</MenuItem>
              <MenuItem value="lowercase">{t('uppercase.lowercase')}</MenuItem>
              <MenuItem value="title_case">{t('uppercase.titleCase')}</MenuItem>
              <MenuItem value="capitalize">
                {t('uppercase.capitalize')}
              </MenuItem>
            </TextField>
          </Stack>
        }
        result={
          <ToolTextResult title={t('uppercase.resultTitle')} value={result} />
        }
      />
    </Box>
  );
}
