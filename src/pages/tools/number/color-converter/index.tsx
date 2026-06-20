import {
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import InputHeader from '@components/InputHeader';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  convertColorForTool,
  createColorConversionText,
  type ColorConverterOptions
} from './service';

const initialOptions: ColorConverterOptions = {
  color: '#336699',
  uppercase: false
};

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'COLOR_CONVERT_ERROR',
      message:
        error instanceof Error ? error.message : 'Color conversion failed'
    },
    null,
    2
  );

export default function ColorConverter({ title }: ToolComponentProps) {
  const { t } = useTranslation('number');
  const [options, setOptions] = useState<ColorConverterOptions>(initialOptions);
  const [result, setResult] = useState('');
  const [swatch, setSwatch] = useState('#336699');

  const updateOption = <TKey extends keyof ColorConverterOptions>(
    key: TKey,
    value: ColorConverterOptions[TKey]
  ) => {
    setOptions((current) => ({
      ...current,
      [key]: value
    }));
  };

  useEffect(() => {
    try {
      const converted = convertColorForTool(options);
      setSwatch(converted?.hex ?? 'transparent');
      setResult(createColorConversionText(options));
    } catch (error) {
      setSwatch('transparent');
      setResult(formatError(error));
    }
  }, [options]);

  const input = (
    <Box>
      <InputHeader title={title} />
      <Stack spacing={1.5}>
        <TextField
          fullWidth
          size="small"
          label={t('colorConverter.color')}
          placeholder={t('colorConverter.colorPlaceholder')}
          value={options.color}
          onChange={(event) => updateOption('color', event.target.value)}
          sx={{ backgroundColor: 'background.paper' }}
        />
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={options.uppercase}
                onChange={(event) =>
                  updateOption('uppercase', event.target.checked)
                }
              />
            }
            label={t('colorConverter.uppercase')}
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
          <Box>
            <Typography mb={1} fontSize={30} color="primary">
              {t('colorConverter.previewTitle')}
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 56,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: swatch
              }}
            />
          </Box>
          <ToolTextResult
            title={t('colorConverter.resultTitle')}
            value={result}
            extension="json"
            keepSpecialCharacters
            monospace
          />
        </Stack>
      }
    />
  );
}
