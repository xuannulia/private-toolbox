import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack
} from '@mui/material';
import TextFieldWithDesc from '@components/options/TextFieldWithDesc';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateCidrText, type CidrCalculatorOptions } from './service';

const initialOptions: CidrCalculatorOptions = {
  cidr: '192.168.1.10/24',
  includeBinary: false
};

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'CIDR_CALCULATE_ERROR',
      message:
        error instanceof Error ? error.message : 'Unable to calculate CIDR'
    },
    null,
    2
  );

export default function CidrCalculator() {
  const { t } = useTranslation('network');
  const [options, setOptions] = useState<CidrCalculatorOptions>(initialOptions);
  const [result, setResult] = useState('');

  const updateOption = <TKey extends keyof CidrCalculatorOptions>(
    key: TKey,
    value: CidrCalculatorOptions[TKey]
  ) => {
    setOptions((current) => ({
      ...current,
      [key]: value
    }));
  };

  useEffect(() => {
    try {
      setResult(calculateCidrText(options));
    } catch (error) {
      setResult(formatError(error));
    }
  }, [options]);

  const input = (
    <Box>
      <Stack spacing={1.5}>
        <TextFieldWithDesc
          fullWidth
          description={t('cidrCalculator.cidrDescription')}
          placeholder={t('cidrCalculator.cidrPlaceholder')}
          value={options.cidr}
          onOwnChange={(value) => updateOption('cidr', value)}
        />
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeBinary}
                onChange={(event) =>
                  updateOption('includeBinary', event.target.checked)
                }
              />
            }
            label={t('cidrCalculator.includeBinary')}
          />
        </FormGroup>
      </Stack>
    </Box>
  );

  return (
    <ToolInputAndResult
      input={input}
      result={
        <ToolTextResult
          title={t('cidrCalculator.resultTitle')}
          value={result}
          extension="json"
          keepSpecialCharacters
          monospace
        />
      }
    />
  );
}
