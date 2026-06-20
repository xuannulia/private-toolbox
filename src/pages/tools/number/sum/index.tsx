import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
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
import { compute, type NumberExtractionType } from './service';

const initialValues = {
  extractionType: 'smart' as NumberExtractionType,
  separator: '\\n',
  printRunningSum: false
};

export default function SumNumbers({ title }: ToolComponentProps) {
  const { t } = useTranslation('number');
  const [input, setInput] = useState('');
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
      compute(
        input,
        options.extractionType,
        options.printRunningSum,
        normalizeNumberToken(options.separator)
      )
    );
  }, [input, options]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('sum.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <NumberOptionStack>
              <CompactNumberToggle<NumberExtractionType>
                value={options.extractionType}
                options={[
                  {
                    label: t('sum.extractionTypes.smart.title'),
                    value: 'smart'
                  },
                  {
                    label: t('sum.extractionTypes.delimiter.title'),
                    value: 'delimiter'
                  }
                ]}
                onChange={(value) => updateOption('extractionType', value)}
              />
              {options.extractionType === 'delimiter' && (
                <CompactNumberField
                  label={t('common.separator')}
                  value={options.separator}
                  type="text"
                  onChange={(value) => updateOption('separator', value)}
                />
              )}
              <CompactNumberCheckbox
                checked={options.printRunningSum}
                label={t('sum.printRunningSum')}
                onChange={(value) => updateOption('printRunningSum', value)}
              />
            </NumberOptionStack>
          </Stack>
        }
        result={<ToolTextResult title={t('sum.resultTitle')} value={result} />}
      />
    </Box>
  );
}
