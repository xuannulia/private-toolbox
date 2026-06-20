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
  CompactNumberToggle,
  NumberOptionStack,
  normalizeNumberToken
} from '../NumberToolControls';
import { formatPorts, generateRandomPorts, validateInput } from './service';
import type { InitialValuesType } from './types';

const initialValues: InitialValuesType = {
  portRange: 'registered',
  minPort: 1024,
  maxPort: 49151,
  count: 5,
  allowDuplicates: false,
  sortResults: false,
  separator: ', '
};

export default function RandomPortGenerator({ title }: ToolComponentProps) {
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

      const generated = generateRandomPorts({
        ...options,
        separator: normalizeNumberToken(options.separator)
      });
      setResult(
        formatPorts(generated.ports, normalizeNumberToken(options.separator))
      );
      setError('');
    } catch (error) {
      console.error('Random port generation failed:', error);
      setResult('');
      setError(t('randomPortGenerator.error.generationFailed'));
    }
  }, [options, t]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Box>
            <InputHeader title={title} />
            <NumberOptionStack>
              <CompactNumberToggle<InitialValuesType['portRange']>
                value={options.portRange}
                options={[
                  {
                    label: t('randomPortGenerator.options.range.wellKnown'),
                    value: 'well-known'
                  },
                  {
                    label: t('randomPortGenerator.options.range.registered'),
                    value: 'registered'
                  },
                  {
                    label: t('randomPortGenerator.options.range.dynamic'),
                    value: 'dynamic'
                  },
                  {
                    label: t('randomPortGenerator.options.range.custom'),
                    value: 'custom'
                  }
                ]}
                onChange={(value) => updateOption('portRange', value)}
              />
              {options.portRange === 'custom' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <CompactNumberField
                    label={t('randomPortGenerator.minPort')}
                    value={options.minPort}
                    onChange={(value) => updateOption('minPort', Number(value))}
                  />
                  <CompactNumberField
                    label={t('randomPortGenerator.maxPort')}
                    value={options.maxPort}
                    onChange={(value) => updateOption('maxPort', Number(value))}
                  />
                </Stack>
              )}
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
                checked={options.allowDuplicates}
                label={t(
                  'randomPortGenerator.options.generation.allowDuplicates.title'
                )}
                onChange={(value) => updateOption('allowDuplicates', value)}
              />
              <CompactNumberCheckbox
                checked={options.sortResults}
                label={t(
                  'randomPortGenerator.options.generation.sortResults.title'
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
              title={t('randomPortGenerator.result.title')}
              value={result}
            />
          </Stack>
        }
      />
    </Box>
  );
}
