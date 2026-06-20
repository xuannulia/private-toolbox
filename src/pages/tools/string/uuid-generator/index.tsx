import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack
} from '@mui/material';
import InputHeader from '@components/InputHeader';
import TextFieldWithDesc from '@components/options/TextFieldWithDesc';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { Icon } from '@iconify/react';
import { ToolComponentProps } from '@tools/defineTool';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateUuidText, type UuidGeneratorOptions } from './service';

const initialOptions: UuidGeneratorOptions = {
  count: '1',
  uppercase: false,
  removeDashes: false
};

export default function UuidGenerator({ title }: ToolComponentProps) {
  const { t } = useTranslation('string');
  const [options, setOptions] = useState<UuidGeneratorOptions>(initialOptions);
  const [result, setResult] = useState('');

  const updateOption = <TKey extends keyof UuidGeneratorOptions>(
    key: TKey,
    value: UuidGeneratorOptions[TKey]
  ) => {
    setOptions((current) => ({
      ...current,
      [key]: value
    }));
  };

  const generate = () => {
    try {
      setResult(generateUuidText(options));
    } catch (error) {
      setResult(
        JSON.stringify(
          {
            code: 'UUID_GENERATE_ERROR',
            message:
              error instanceof Error ? error.message : 'Unable to generate UUID'
          },
          null,
          2
        )
      );
    }
  };

  const input = (
    <Box>
      <InputHeader title={t('uuidGenerator.optionsTitle')} />
      <Stack spacing={1.5}>
        <TextFieldWithDesc
          description={t('uuidGenerator.countDescription')}
          placeholder={t('uuidGenerator.countPlaceholder')}
          value={options.count}
          onOwnChange={(value) => updateOption('count', value)}
          type="number"
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
            label={t('uuidGenerator.uppercase')}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={options.removeDashes}
                onChange={(event) =>
                  updateOption('removeDashes', event.target.checked)
                }
              />
            }
            label={t('uuidGenerator.removeDashes')}
          />
        </FormGroup>
        <Button
          variant="contained"
          startIcon={<Icon icon="material-symbols:casino" />}
          onClick={generate}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('uuidGenerator.generate')}
        </Button>
      </Stack>
    </Box>
  );

  return (
    <ToolInputAndResult
      input={input}
      result={
        <ToolTextResult
          title={t('uuidGenerator.resultTitle')}
          value={result}
          extension="txt"
          monospace
        />
      }
    />
  );
}
