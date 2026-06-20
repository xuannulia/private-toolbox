import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CompactSelect,
  CompactTextField,
  normalizeCsvToken
} from '../CsvToolControls';
import { convertTsvToJson } from './service';
import { InitialValuesType } from './types';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'TSV to JSON failed';

export default function TsvToJson() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<InitialValuesType>({
    delimiter: '\t',
    quote: '"',
    comment: '#',
    useHeaders: true,
    skipEmptyLines: true,
    dynamicTypes: true,
    indentationType: 'space',
    spacesCount: 2
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
        convertTsvToJson(input, {
          ...options,
          delimiter: normalizeCsvToken(options.delimiter),
          quote: normalizeCsvToken(options.quote),
          comment: normalizeCsvToken(options.comment)
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
              title={t('common.inputTsv')}
              value={input}
              onChange={setInput}
            />
            <Stack spacing={1.5}>
              <CompactTextField
                label={t('common.quote')}
                value={options.quote}
                onChange={(value) => updateOption('quote', value)}
              />
              <CompactTextField
                label={t('common.comment')}
                value={options.comment}
                onChange={(value) => updateOption('comment', value)}
              />
              <CompactCheckbox
                checked={options.useHeaders}
                label={t('common.useHeaders')}
                onChange={(value) => updateOption('useHeaders', value)}
              />
              <CompactCheckbox
                checked={options.skipEmptyLines}
                label={t('common.skipEmptyLines')}
                onChange={(value) => updateOption('skipEmptyLines', value)}
              />
              <CompactCheckbox
                checked={options.dynamicTypes}
                label={t('csvToJson.dynamicTypes')}
                onChange={(value) => updateOption('dynamicTypes', value)}
              />
              <CompactSelect
                label={t('common.jsonIndent')}
                value={options.indentationType}
                options={[
                  { label: t('common.indentSpaces'), value: 'space' },
                  { label: t('common.indentTabs'), value: 'tab' },
                  { label: t('common.minified'), value: 'none' }
                ]}
                onChange={(value) => updateOption('indentationType', value)}
              />
              {options.indentationType === 'space' && (
                <CompactTextField
                  label={t('common.indentSpaces')}
                  type="number"
                  value={options.spacesCount}
                  onChange={(value) =>
                    updateOption('spacesCount', Number(value) || 0)
                  }
                />
              )}
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
