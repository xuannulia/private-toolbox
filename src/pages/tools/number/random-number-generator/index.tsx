import { Alert, Box, Stack } from '@mui/material';
import InputHeader from '@components/InputHeader';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import type { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactNumberCheckbox,
  CompactNumberField,
  NumberOptionStack,
  normalizeNumberToken
} from '../NumberToolControls';
import { formatNumbers, generateRandomNumbers, validateInput } from './service';
import type { InitialValuesType } from './types';

const initialValues: InitialValuesType = {
  minValue: 1,
  maxValue: 100,
  count: 10,
  allowDecimals: false,
  allowDuplicates: true,
  sortResults: false,
  separator: ', '
};

export default function RandomNumberGenerator({ title }: ToolComponentProps) {
  const { t } = useTranslation('number');
  const [options, setOptions] = useState<InitialValuesType>(initialValues);
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
      const validationError = validateInput(options);
      if (validationError) {
        setError(validationError);
        setResult('');
        return;
      }

      const generated = generateRandomNumbers({
        ...options,
        separator: normalizeNumberToken(options.separator)
      });
      setResult(
        formatNumbers(
          generated.numbers,
          normalizeNumberToken(options.separator),
          options.allowDecimals
        )
      );
      setError('');
    } catch (error) {
      console.error('Random number generation failed:', error);
      setResult('');
      setError(t('randomNumberGenerator.error.generationFailed'));
    }
  }, [options, t]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Box>
            <InputHeader title={title} />
            <NumberOptionStack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactNumberField
                  label={t('common.minValue')}
                  value={options.minValue}
                  onChange={(value) => updateOption('minValue', Number(value))}
                />
                <CompactNumberField
                  label={t('common.maxValue')}
                  value={options.maxValue}
                  onChange={(value) => updateOption('maxValue', Number(value))}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactNumberField
                  label={t('common.count')}
                  value={options.count}
                  onChange={(value) => updateOption('count', Number(value))}
                />
                <CompactNumberField
                  label={t('common.separator')}
                  value={options.separator}
                  type="text"
                  onChange={(value) => updateOption('separator', value)}
                />
              </Stack>
              <CompactNumberCheckbox
                checked={options.allowDecimals}
                label={t(
                  'randomNumberGenerator.options.generation.allowDecimals.title'
                )}
                onChange={(value) => updateOption('allowDecimals', value)}
              />
              <CompactNumberCheckbox
                checked={options.allowDuplicates}
                label={t(
                  'randomNumberGenerator.options.generation.allowDuplicates.title'
                )}
                onChange={(value) => updateOption('allowDuplicates', value)}
              />
              <CompactNumberCheckbox
                checked={options.sortResults}
                label={t(
                  'randomNumberGenerator.options.generation.sortResults.title'
                )}
                onChange={(value) => updateOption('sortResults', value)}
              />
            </NumberOptionStack>
          </Box>
        }
        result={
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <ToolTextResult
              title={t('randomNumberGenerator.result.title')}
              value={result}
            />
          </Stack>
        }
      />
    </Box>
  );
}
