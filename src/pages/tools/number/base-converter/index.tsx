import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField
} from '@mui/material';
import InputHeader from '@components/InputHeader';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  convertBaseForTool,
  createBaseConversionText,
  type BaseConverterOptions
} from './service';

const initialOptions: BaseConverterOptions = {
  value: 'ff',
  fromBase: '16',
  toBase: '10',
  uppercase: false,
  outputPrefix: false
};

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'BASE_CONVERT_ERROR',
      message: error instanceof Error ? error.message : 'Base conversion failed'
    },
    null,
    2
  );

export default function BaseConverter({ title }: ToolComponentProps) {
  const { t } = useTranslation('number');
  const [options, setOptions] = useState<BaseConverterOptions>(initialOptions);
  const [resultText, setResultText] = useState('');
  const [quickResult, setQuickResult] = useState({
    output: '',
    decimal: '',
    binary: '',
    octal: '',
    hexadecimal: ''
  });

  const updateOption = <TKey extends keyof BaseConverterOptions>(
    key: TKey,
    value: BaseConverterOptions[TKey]
  ) => {
    setOptions((current) => ({
      ...current,
      [key]: value
    }));
  };

  useEffect(() => {
    try {
      const converted = convertBaseForTool(options);
      setResultText(createBaseConversionText(options));
      setQuickResult({
        output: converted?.prefixedValue ?? '',
        decimal: converted?.decimal ?? '',
        binary: converted?.binary ?? '',
        octal: converted?.octal ?? '',
        hexadecimal: converted?.hexadecimal ?? ''
      });
    } catch (error) {
      setResultText(formatError(error));
      setQuickResult({
        output: '',
        decimal: '',
        binary: '',
        octal: '',
        hexadecimal: ''
      });
    }
  }, [options]);

  const input = (
    <Box>
      <InputHeader title={title} />
      <Stack spacing={1.5}>
        <TextField
          fullWidth
          size="small"
          label={t('baseConverter.value')}
          placeholder={t('baseConverter.valuePlaceholder')}
          value={options.value}
          onChange={(event) => updateOption('value', event.target.value)}
          sx={{ backgroundColor: 'background.paper' }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            fullWidth
            size="small"
            label={t('baseConverter.fromBase')}
            placeholder="auto"
            value={options.fromBase}
            onChange={(event) => updateOption('fromBase', event.target.value)}
            sx={{ backgroundColor: 'background.paper' }}
          />
          <TextField
            fullWidth
            size="small"
            label={t('baseConverter.toBase')}
            value={options.toBase}
            onChange={(event) => updateOption('toBase', event.target.value)}
            sx={{ backgroundColor: 'background.paper' }}
          />
        </Stack>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={options.uppercase}
                onChange={(event) =>
                  updateOption('uppercase', event.target.checked)
                }
              />
            }
            label={t('baseConverter.uppercase')}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={options.outputPrefix}
                onChange={(event) =>
                  updateOption('outputPrefix', event.target.checked)
                }
              />
            }
            label={t('baseConverter.outputPrefix')}
          />
        </FormGroup>
      </Stack>
    </Box>
  );

  return (
    <ToolInputAndResult
      input={input}
      result={
        <Stack spacing={2}>
          <TextField
            fullWidth
            size="small"
            label={t('baseConverter.outputValue')}
            value={quickResult.output}
            InputProps={{ readOnly: true }}
            sx={{ backgroundColor: 'background.paper' }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))'
              },
              gap: 1.5
            }}
          >
            {(['decimal', 'binary', 'octal', 'hexadecimal'] as const).map(
              (key) => (
                <TextField
                  key={key}
                  fullWidth
                  size="small"
                  label={t(`baseConverter.${key}`)}
                  value={quickResult[key]}
                  InputProps={{ readOnly: true }}
                  sx={{ backgroundColor: 'background.paper' }}
                />
              )
            )}
          </Box>
          <ToolTextResult
            title={t('baseConverter.resultTitle')}
            value={resultText}
            extension="json"
            keepSpecialCharacters
            monospace
          />
        </Stack>
      }
    />
  );
}
