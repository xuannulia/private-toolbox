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
import { main } from './service';
import { InitialValuesType } from './types';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'CSV to YAML failed';

export default function CsvToYaml() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<InitialValuesType>({
    csvSeparator: ',',
    quoteCharacter: '"',
    commentCharacter: '#',
    emptyLines: true,
    headerRow: true,
    spaces: 2
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
        main(input, {
          ...options,
          csvSeparator: normalizeCsvToken(options.csvSeparator),
          quoteCharacter: normalizeCsvToken(options.quoteCharacter),
          commentCharacter: normalizeCsvToken(options.commentCharacter)
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
              delimiter={options.csvSeparator}
              quote={options.quoteCharacter}
              comment={options.commentCharacter}
              labels={{
                delimiter: t('common.inputDelimiter'),
                quote: t('common.quote'),
                comment: t('common.comment')
              }}
              onDelimiterChange={(value) => updateOption('csvSeparator', value)}
              onQuoteChange={(value) => updateOption('quoteCharacter', value)}
              onCommentChange={(value) =>
                updateOption('commentCharacter', value)
              }
            />
            <Stack spacing={0.5}>
              <CompactCheckbox
                checked={options.headerRow}
                label={t('common.useHeaders')}
                onChange={(value) => updateOption('headerRow', value)}
              />
              <CompactCheckbox
                checked={options.emptyLines}
                label={t('common.skipEmptyLines')}
                onChange={(value) => updateOption('emptyLines', value)}
              />
              <CompactTextField
                label={t('common.indentSpaces')}
                type="number"
                value={options.spaces}
                onChange={(value) => updateOption('spaces', Number(value) || 0)}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="yaml"
            keepSpecialCharacters
            monospace
            title={t('common.outputYaml')}
            value={output}
          />
        }
      />
    </Box>
  );
}
