import { Box, Stack } from '@mui/material';
import CheckboxWithDesc from '@components/options/CheckboxWithDesc';
import ColorSelector from '@components/options/ColorSelector';
import InputHeader from '@components/InputHeader';
import TextFieldWithDesc from '@components/options/TextFieldWithDesc';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBarcodeSvgFile, type BarcodeWebOptions } from './service';

const initialOptions: BarcodeWebOptions = {
  text: 'ABC123',
  moduleWidth: '2',
  height: '96',
  margin: '10',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  displayText: true
};

export default function BarcodeGenerator({ title }: ToolComponentProps) {
  const { t } = useTranslation('image');
  const [options, setOptions] = useState<BarcodeWebOptions>(initialOptions);
  const [result, setResult] = useState<File | null>(null);

  const updateOption = <TKey extends keyof BarcodeWebOptions>(
    key: TKey,
    value: BarcodeWebOptions[TKey]
  ) => {
    setOptions((current) => ({
      ...current,
      [key]: value
    }));
  };

  useEffect(() => {
    try {
      setResult(createBarcodeSvgFile(options));
    } catch {
      setResult(null);
    }
  }, [options]);

  const input = (
    <Stack spacing={2}>
      <ToolTextInput
        title={t('barcode.inputTitle')}
        value={options.text}
        onChange={(value) => updateOption('text', value)}
      />
      <Box>
        <InputHeader title={t('barcode.optionsTitle')} />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0, sm: 2 }}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <TextFieldWithDesc
            description={t('barcode.moduleWidth')}
            inputProps={{ min: 1, max: 10, type: 'number' }}
            onOwnChange={(value) => updateOption('moduleWidth', value)}
            value={options.moduleWidth}
          />
          <TextFieldWithDesc
            description={t('barcode.height')}
            inputProps={{ min: 24, max: 400, type: 'number' }}
            onOwnChange={(value) => updateOption('height', value)}
            value={options.height}
          />
          <TextFieldWithDesc
            description={t('barcode.margin')}
            inputProps={{ min: 0, max: 50, type: 'number' }}
            onOwnChange={(value) => updateOption('margin', value)}
            value={options.margin}
          />
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0, sm: 2 }}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <ColorSelector
            description={t('barcode.foregroundColor')}
            onColorChange={(value) => updateOption('foregroundColor', value)}
            value={options.foregroundColor}
          />
          <ColorSelector
            description={t('barcode.backgroundColor')}
            onColorChange={(value) => updateOption('backgroundColor', value)}
            value={options.backgroundColor}
          />
        </Stack>
        <CheckboxWithDesc
          checked={options.displayText}
          onChange={(value) => updateOption('displayText', value)}
          title={t('barcode.displayText')}
        />
      </Box>
    </Stack>
  );

  return (
    <ToolInputAndResult
      input={input}
      result={
        <ToolFileResult
          extension="svg"
          title={t('barcode.resultTitle')}
          value={result}
        />
      }
    />
  );
}
