import { Box, Checkbox, FormControlLabel, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPalindromeList } from './service';

export default function CreatePalindrome() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [lastChar, setLastChar] = useState(true);
  const [multiLine, setMultiLine] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(input ? createPalindromeList(input, lastChar, multiLine) : '');
  }, [input, lastChar, multiLine]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('createPalindrome.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Stack spacing={0.5}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={lastChar}
                    onChange={(event) => setLastChar(event.target.checked)}
                    size="small"
                  />
                }
                label={t('createPalindrome.includeLastChar')}
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
                label={t('createPalindrome.multiLine')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('createPalindrome.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
