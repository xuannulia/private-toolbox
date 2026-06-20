import { Box, Checkbox, FormControlLabel, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { stringReverser } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Text reverse failed';

export default function Reverse() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [multiLine, setMultiLine] = useState(true);
  const [emptyItems, setEmptyItems] = useState(false);
  const [trim, setTrim] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(stringReverser(input, multiLine, emptyItems, trim));
    } catch (error) {
      setResult(formatError(error));
    }
  }, [emptyItems, input, multiLine, trim]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('reverse.inputTitle')}
              value={input}
              onChange={setInput}
            />
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
                label={t('reverse.processMultiLine')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={emptyItems}
                    onChange={(event) => setEmptyItems(event.target.checked)}
                    size="small"
                  />
                }
                label={t('reverse.skipEmptyLines')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={trim}
                    onChange={(event) => setTrim(event.target.checked)}
                    size="small"
                  />
                }
                label={t('reverse.trimWhitespace')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('reverse.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
