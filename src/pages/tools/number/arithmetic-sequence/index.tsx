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
import { generateArithmeticSequence } from './service';

type Options = {
  firstTerm: string;
  commonDifference: string;
  numberOfTerms: string;
  separator: string;
};

const initialValues: Options = {
  firstTerm: '1',
  commonDifference: '2',
  numberOfTerms: '10',
  separator: ', '
};

export default function ArithmeticSequence({ title }: ToolComponentProps) {
  const { t } = useTranslation('number');
  const [options, setOptions] = useState<Options>(initialValues);
  const [result, setResult] = useState('');

  const updateOption = <K extends keyof Options>(key: K, value: Options[K]) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    setResult(
      generateArithmeticSequence(
        Number(options.firstTerm),
        Number(options.commonDifference),
        Math.max(0, Number(options.numberOfTerms)),
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
                  label={t('arithmeticSequence.firstTerm')}
                  value={options.firstTerm}
                  onChange={(value) => updateOption('firstTerm', value)}
                />
                <CompactNumberField
                  label={t('arithmeticSequence.commonDifference')}
                  value={options.commonDifference}
                  onChange={(value) => updateOption('commonDifference', value)}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactNumberField
                  label={t('arithmeticSequence.numberOfTerms')}
                  value={options.numberOfTerms}
                  onChange={(value) => updateOption('numberOfTerms', value)}
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
          <ToolTextResult
            title={t('arithmeticSequence.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
