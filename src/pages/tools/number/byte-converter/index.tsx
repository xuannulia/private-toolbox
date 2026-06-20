import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import type { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactNumberField,
  CompactNumberSelect,
  NumberOptionStack
} from '../NumberToolControls';
import { byteConverter } from './service';
import { DATA_UNITS } from './types';
import type { DataUnit, InitialValuesType } from './types';

const initialValues: InitialValuesType = {
  fromUnit: 'GB',
  toUnit: 'KB',
  precision: 2
};

export default function ByteConverter({ title }: ToolComponentProps) {
  const { t } = useTranslation('number');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<InitialValuesType>(initialValues);
  const [result, setResult] = useState('');

  const updateOption = <K extends keyof InitialValuesType>(
    key: K,
    value: InitialValuesType[K]
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    setResult(byteConverter(input, options));
  }, [input, options]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('byteConverter.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <NumberOptionStack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactNumberSelect<DataUnit>
                  label={t('byteConverter.fromUnit')}
                  value={options.fromUnit}
                  options={DATA_UNITS.map((unit) => ({
                    label: unit,
                    value: unit
                  }))}
                  onChange={(value) => updateOption('fromUnit', value)}
                />
                <CompactNumberSelect<DataUnit>
                  label={t('byteConverter.toUnit')}
                  value={options.toUnit}
                  options={DATA_UNITS.map((unit) => ({
                    label: unit,
                    value: unit
                  }))}
                  onChange={(value) => updateOption('toUnit', value)}
                />
              </Stack>
              <CompactNumberField
                label={t('byteConverter.precision')}
                value={options.precision}
                onChange={(value) =>
                  updateOption('precision', Math.max(0, Number(value)))
                }
              />
            </NumberOptionStack>
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('byteConverter.outputTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
