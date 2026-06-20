import { Box, FormControlLabel, Stack, Switch } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { slugGenerator } from './service';

export default function SlugGenerator() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(slugGenerator(input, { caseSensitive }));
  }, [caseSensitive, input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('slugGenerator.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Switch
                  checked={caseSensitive}
                  onChange={(event) => setCaseSensitive(event.target.checked)}
                  size="small"
                />
              }
              label={t('slugGenerator.options.caseLabel')}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            monospace
            title={t('slugGenerator.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
