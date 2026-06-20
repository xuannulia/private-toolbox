import { Box, Stack } from '@mui/material';
import InputHeader from '@components/InputHeader';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import type { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactNumberField,
  NumberOptionStack,
  normalizeNumberToken
} from '../NumberToolControls';
import { listOfIntegers } from './service';

const initialValues = {
  firstValue: '1',
  numberOfNumbers: '10',
  step: '1',
  separator: '\\n'
};

export default function GenerateNumbers({ title }: ToolComponentProps) {
  const { t } = useTranslation('number');
  const [options, setOptions] = useState(initialValues);
  const [result, setResult] = useState('');

  const updateOption = <K extends keyof typeof initialValues>(
    key: K,
    value: (typeof initialValues)[K]
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    setResult(
      listOfIntegers(
        Number(options.firstValue),
        Math.max(0, Number(options.numberOfNumbers)),
        Number(options.step),
        normalizeNumberToken(options.separator)
      )
    );
  }, [options]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Box>
            <InputHeader title={title} />
            <NumberOptionStack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactNumberField
                  label={t('generate.firstValue')}
                  value={options.firstValue}
                  onChange={(value) => updateOption('firstValue', value)}
                />
                <CompactNumberField
                  label={t('generate.step')}
                  value={options.step}
                  onChange={(value) => updateOption('step', value)}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactNumberField
                  label={t('generate.numberOfNumbers')}
                  value={options.numberOfNumbers}
                  onChange={(value) => updateOption('numberOfNumbers', value)}
                />
                <CompactNumberField
                  label={t('common.separator')}
                  value={options.separator}
                  type="text"
                  onChange={(value) => updateOption('separator', value)}
                />
              </Stack>
            </NumberOptionStack>
          </Box>
        }
        result={
          <ToolTextResult title={t('generate.resultTitle')} value={result} />
        }
      />
    </Box>
  );
}
