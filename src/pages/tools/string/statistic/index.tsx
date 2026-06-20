import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { textStatistics } from './service';
import { InitialValuesType } from './types';

const initialValues: InitialValuesType = {
  emptyLines: false,
  sentenceDelimiters: '',
  wordDelimiters: '',
  characterCount: false,
  wordCount: false
};

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Text statistics failed';

export default function TextStatistic() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [emptyLines, setEmptyLines] = useState(initialValues.emptyLines);
  const [sentenceDelimiters, setSentenceDelimiters] = useState(
    initialValues.sentenceDelimiters
  );
  const [wordDelimiters, setWordDelimiters] = useState(
    initialValues.wordDelimiters
  );
  const [characterCount, setCharacterCount] = useState(
    initialValues.characterCount
  );
  const [wordCount, setWordCount] = useState(initialValues.wordCount);
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
        textStatistics(input, {
          emptyLines,
          sentenceDelimiters,
          wordDelimiters,
          characterCount,
          wordCount
        })
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    characterCount,
    emptyLines,
    input,
    sentenceDelimiters,
    wordCount,
    wordDelimiters
  ]);

  const output = error ? t('statistic.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('statistic.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Stack spacing={0.5}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={wordCount}
                    onChange={(event) => setWordCount(event.target.checked)}
                    size="small"
                  />
                }
                label={t('statistic.wordFrequencyAnalysis')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={characterCount}
                    onChange={(event) =>
                      setCharacterCount(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('statistic.characterFrequencyAnalysis')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={emptyLines}
                    onChange={(event) => setEmptyLines(event.target.checked)}
                    size="small"
                  />
                }
                label={t('statistic.includeEmptyLines')}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={t('statistic.sentenceDelimitersLabel')}
                size="small"
                value={sentenceDelimiters}
                onChange={(event) => setSentenceDelimiters(event.target.value)}
              />
              <TextField
                fullWidth
                label={t('statistic.wordDelimitersLabel')}
                size="small"
                value={wordDelimiters}
                onChange={(event) => setWordDelimiters(event.target.value)}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('statistic.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
