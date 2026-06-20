import { Box, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createJsonSchemaMockText,
  type JsonSchemaMockOptions
} from './service';

const initialSchema = JSON.stringify(
  {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'integer', minimum: 1 },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      roles: {
        type: 'array',
        items: { enum: ['admin', 'user'] }
      }
    }
  },
  null,
  2
);

const initialOptions: JsonSchemaMockOptions = {
  schemaText: initialSchema,
  arrayItemCount: '2',
  includeOptionalProperties: true
};

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Mock JSON generation failed';

export default function JsonSchemaMock() {
  const { t } = useTranslation('json');
  const [options, setOptions] = useState<JsonSchemaMockOptions>(initialOptions);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const updateOption = <TKey extends keyof JsonSchemaMockOptions>(
    key: TKey,
    value: JsonSchemaMockOptions[TKey]
  ) => {
    setOptions((current) => ({
      ...current,
      [key]: value
    }));
  };

  useEffect(() => {
    try {
      setResult(createJsonSchemaMockText(options));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [options]);

  const output = error ? t('jsonSchemaMock.invalidInput', { error }) : result;

  const input = (
    <Stack spacing={2}>
      <ToolCodeInput
        title={t('jsonSchemaMock.schemaTitle')}
        value={options.schemaText}
        onChange={(value) => updateOption('schemaText', value)}
        language="json"
      />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <TextField
          fullWidth
          size="small"
          type="number"
          label={t('jsonSchemaMock.arrayItemCount')}
          placeholder={t('jsonSchemaMock.arrayItemCountPlaceholder')}
          value={options.arrayItemCount}
          onChange={(event) =>
            updateOption('arrayItemCount', event.target.value)
          }
          inputProps={{ min: 0, max: 20, step: 1 }}
          sx={{ backgroundColor: 'background.paper' }}
        />
        <FormControlLabel
          sx={{ m: 0, minWidth: 160 }}
          control={
            <Switch
              checked={options.includeOptionalProperties}
              onChange={(event) =>
                updateOption('includeOptionalProperties', event.target.checked)
              }
              size="small"
            />
          }
          label={t('jsonSchemaMock.includeOptionalProperties')}
        />
      </Stack>
    </Stack>
  );

  return (
    <ToolInputAndResult
      input={input}
      result={
        <ToolTextResult
          disabled={!result || Boolean(error)}
          title={t('jsonSchemaMock.resultTitle')}
          value={output}
          extension="json"
          keepSpecialCharacters
          monospace
        />
      }
    />
  );
}
