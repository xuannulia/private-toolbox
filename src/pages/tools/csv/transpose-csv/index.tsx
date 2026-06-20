import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CompactTextField,
  CsvFormatFields,
  normalizeCsvToken
} from '../CsvToolControls';
import { transposeCSV } from './service';
import { InitialValuesType } from './types';

export default function TransposeCsv() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<InitialValuesType>({
    separator: ',',
    commentCharacter: '#',
    customFill: false,
    customFillValue: 'x',
    quoteChar: '"'
  });
  const [result, setResult] = useState('');

  const updateOption = <K extends keyof InitialValuesType>(
    key: K,
    value: InitialValuesType[K]
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    setResult(
      transposeCSV(input, {
        ...options,
        separator: normalizeCsvToken(options.separator),
        quoteChar: normalizeCsvToken(options.quoteChar),
        commentCharacter: normalizeCsvToken(options.commentCharacter)
      })
    );
  }, [input, options]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('common.inputCsv')}
              value={input}
              onChange={setInput}
            />
            <CsvFormatFields
              delimiter={options.separator}
              quote={options.quoteChar}
              comment={options.commentCharacter}
              labels={{
                delimiter: t('common.inputDelimiter'),
                quote: t('common.quote'),
                comment: t('common.comment')
              }}
              onDelimiterChange={(value) => updateOption('separator', value)}
              onQuoteChange={(value) => updateOption('quoteChar', value)}
              onCommentChange={(value) =>
                updateOption('commentCharacter', value)
              }
            />
            <Stack spacing={1.5}>
              <CompactCheckbox
                checked={options.customFill}
                label={t('common.useFillValue')}
                onChange={(value) => updateOption('customFill', value)}
              />
              {options.customFill && (
                <CompactTextField
                  label={t('common.fillValue')}
                  value={options.customFillValue}
                  onChange={(value) => updateOption('customFillValue', value)}
                />
              )}
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            extension="csv"
            keepSpecialCharacters
            monospace
            title={t('transposeCsv.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
