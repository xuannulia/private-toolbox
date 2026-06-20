import { Box, FormControlLabel, Stack, Switch } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { escapeJson } from './service';

export default function EscapeJsonTool() {
  const { t } = useTranslation('json');
  const [input, setInput] = useState('');
  const [wrapInQuotes, setWrapInQuotes] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!input.length) {
      setResult('');
      return;
    }

    setResult(escapeJson(input, wrapInQuotes));
  }, [input, wrapInQuotes]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolCodeInput
              title={t('escapeJson.inputTitle')}
              value={input}
              onChange={setInput}
              language="json"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={wrapInQuotes}
                  onChange={(event) => setWrapInQuotes(event.target.checked)}
                  size="small"
                />
              }
              label={t('escapeJson.wrapInQuotes')}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            extension="json"
            keepSpecialCharacters
            monospace
            title={t('escapeJson.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
