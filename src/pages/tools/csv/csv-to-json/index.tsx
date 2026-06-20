import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CsvFormatFields,
  normalizeCsvToken
} from '../CsvToolControls';
import { convertCsvToJson } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Invalid CSV format';

export default function CsvToJson() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [quote, setQuote] = useState('"');
  const [comment, setComment] = useState('#');
  const [useHeaders, setUseHeaders] = useState(true);
  const [skipEmptyLines, setSkipEmptyLines] = useState(true);
  const [dynamicTypes, setDynamicTypes] = useState(true);
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
        convertCsvToJson(input, {
          delimiter: normalizeCsvToken(delimiter),
          quote: normalizeCsvToken(quote),
          comment: normalizeCsvToken(comment),
          useHeaders,
          skipEmptyLines,
          dynamicTypes
        })
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    comment,
    delimiter,
    dynamicTypes,
    input,
    quote,
    skipEmptyLines,
    useHeaders
  ]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('csvToJson.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <CsvFormatFields
              delimiter={delimiter}
              quote={quote}
              comment={comment}
              labels={{
                delimiter: t('common.inputDelimiter'),
                quote: t('common.quote'),
                comment: t('common.comment')
              }}
              onDelimiterChange={setDelimiter}
              onQuoteChange={setQuote}
              onCommentChange={setComment}
            />
            <Stack spacing={0.5}>
              <CompactCheckbox
                checked={useHeaders}
                label={t('csvToJson.useHeaders')}
                onChange={setUseHeaders}
              />
              <CompactCheckbox
                checked={skipEmptyLines}
                label={t('csvToJson.skipEmptyLines')}
                onChange={setSkipEmptyLines}
              />
              <CompactCheckbox
                checked={dynamicTypes}
                label={t('csvToJson.dynamicTypes')}
                onChange={setDynamicTypes}
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
            title={t('csvToJson.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
