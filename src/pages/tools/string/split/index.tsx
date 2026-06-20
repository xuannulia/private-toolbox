import { Box, MenuItem, Stack, TextField } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { replaceSpecialCharacters } from '@utils/string';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { compute, SplitOperatorType } from './service';

const splitModes: SplitOperatorType[] = ['symbol', 'regex', 'length', 'chunks'];

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Split text failed';

export default function SplitText() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [splitSeparatorType, setSplitSeparatorType] =
    useState<SplitOperatorType>('symbol');
  const [symbolValue, setSymbolValue] = useState(' ');
  const [regexValue, setRegexValue] = useState('\\s+');
  const [lengthValue, setLengthValue] = useState('16');
  const [chunksValue, setChunksValue] = useState('4');
  const [outputSeparator, setOutputSeparator] = useState('\\n');
  const [charBeforeChunk, setCharBeforeChunk] = useState('');
  const [charAfterChunk, setCharAfterChunk] = useState('');
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
        compute(
          splitSeparatorType,
          input,
          replaceSpecialCharacters(symbolValue),
          regexValue,
          Number(lengthValue),
          Number(chunksValue),
          replaceSpecialCharacters(charBeforeChunk),
          replaceSpecialCharacters(charAfterChunk),
          replaceSpecialCharacters(outputSeparator)
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    charAfterChunk,
    charBeforeChunk,
    chunksValue,
    input,
    lengthValue,
    outputSeparator,
    regexValue,
    splitSeparatorType,
    symbolValue
  ]);

  const output = error ? t('split.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('split.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <TextField
              select
              fullWidth
              label={t('split.modeLabel')}
              size="small"
              value={splitSeparatorType}
              onChange={(event) =>
                setSplitSeparatorType(event.target.value as SplitOperatorType)
              }
              sx={{ backgroundColor: 'background.paper' }}
            >
              {splitModes.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {t(`split.${mode}Title`)}
                </MenuItem>
              ))}
            </TextField>
            {splitSeparatorType === 'symbol' && (
              <TextField
                label={t('split.separatorLabel')}
                size="small"
                value={symbolValue}
                onChange={(event) => setSymbolValue(event.target.value)}
              />
            )}
            {splitSeparatorType === 'regex' && (
              <TextField
                label={t('split.regexLabel')}
                size="small"
                value={regexValue}
                onChange={(event) => setRegexValue(event.target.value)}
              />
            )}
            {splitSeparatorType === 'length' && (
              <TextField
                label={t('split.lengthLabel')}
                size="small"
                type="number"
                value={lengthValue}
                onChange={(event) => setLengthValue(event.target.value)}
              />
            )}
            {splitSeparatorType === 'chunks' && (
              <TextField
                label={t('split.chunksLabel')}
                size="small"
                type="number"
                value={chunksValue}
                onChange={(event) => setChunksValue(event.target.value)}
              />
            )}
            <TextField
              label={t('split.outputSeparatorLabel')}
              size="small"
              value={outputSeparator}
              onChange={(event) => setOutputSeparator(event.target.value)}
            />
            {splitSeparatorType === 'chunks' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label={t('split.prefixLabel')}
                  size="small"
                  value={charBeforeChunk}
                  onChange={(event) => setCharBeforeChunk(event.target.value)}
                />
                <TextField
                  fullWidth
                  label={t('split.suffixLabel')}
                  size="small"
                  value={charAfterChunk}
                  onChange={(event) => setCharAfterChunk(event.target.value)}
                />
              </Stack>
            )}
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('split.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
