import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, Button, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { randomizeCase } from './service';

export default function RandomizeCase() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(input ? randomizeCase(input) : '');
  }, [generation, input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('randomizeCase.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Button
              disabled={!input}
              startIcon={<RefreshIcon />}
              variant="contained"
              onClick={() => setGeneration((value) => value + 1)}
            >
              {t('randomizeCase.randomize')}
            </Button>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('randomizeCase.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
