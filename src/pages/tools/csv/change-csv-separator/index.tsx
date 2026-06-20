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
import { changeCsvSeparator } from './service';
import { InitialValuesType } from './types';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Change CSV separator failed';

export default function ChangeCsvDelimiter() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<InitialValuesType>({
    inputSeparator: ',',
    inputQuoteCharacter: '"',
    commentCharacter: '#',
    emptyLines: false,
    outputSeparator: ';',
    outputQuoteAll: false,
    OutputQuoteCharacter: '"'
  });
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const updateOption = <K extends keyof InitialValuesType>(
    key: K,
    value: InitialValuesType[K]
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    try {
      setResult(
        changeCsvSeparator(input, {
          ...options,
          inputSeparator: normalizeCsvToken(options.inputSeparator),
          inputQuoteCharacter: normalizeCsvToken(options.inputQuoteCharacter),
          commentCharacter: normalizeCsvToken(options.commentCharacter),
          outputSeparator: normalizeCsvToken(options.outputSeparator),
          OutputQuoteCharacter: normalizeCsvToken(options.OutputQuoteCharacter)
        })
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, options]);

  const output = error ? t('common.errorFallback', { error }) : result;

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
              delimiter={options.inputSeparator}
              quote={options.inputQuoteCharacter}
              comment={options.commentCharacter}
              labels={{
                delimiter: t('common.inputDelimiter'),
                quote: t('common.quote'),
                comment: t('common.comment')
              }}
              onDelimiterChange={(value) =>
                updateOption('inputSeparator', value)
              }
              onQuoteChange={(value) =>
                updateOption('inputQuoteCharacter', value)
              }
              onCommentChange={(value) =>
                updateOption('commentCharacter', value)
              }
            />
            <Stack spacing={1.5}>
              <CompactTextField
                label={t('common.outputDelimiter')}
                value={options.outputSeparator}
                onChange={(value) => updateOption('outputSeparator', value)}
              />
              <CompactCheckbox
                checked={options.emptyLines}
                label={t('common.skipEmptyLines')}
                onChange={(value) => updateOption('emptyLines', value)}
              />
              <CompactCheckbox
                checked={options.outputQuoteAll}
                label={t('common.quoteAllFields')}
                onChange={(value) => updateOption('outputQuoteAll', value)}
              />
              {options.outputQuoteAll && (
                <CompactTextField
                  label={t('common.outputQuote')}
                  value={options.OutputQuoteCharacter}
                  onChange={(value) =>
                    updateOption('OutputQuoteCharacter', value)
                  }
                />
              )}
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="csv"
            keepSpecialCharacters
            monospace
            title={t('common.outputCsv')}
            value={output}
          />
        }
      />
    </Box>
  );
}
