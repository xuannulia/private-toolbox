import { Box, Stack } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { validateJsonSchema } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const initialData = JSON.stringify(
  {
    name: 'Ada',
    age: 36
  },
  null,
  2
);

const initialSchema = JSON.stringify(
  {
    type: 'object',
    required: ['name', 'age'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      age: { type: 'integer', minimum: 18 }
    }
  },
  null,
  2
);

const formatResult = (value: unknown): string => JSON.stringify(value, null, 2);

export default function JsonSchemaValidator({ title }: ToolComponentProps) {
  const { t } = useTranslation('json');
  const [dataText, setDataText] = useState(initialData);
  const [schemaText, setSchemaText] = useState(initialSchema);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(formatResult(validateJsonSchema({ dataText, schemaText })));
    } catch (error) {
      setResult(
        formatResult({
          valid: false,
          error: error instanceof Error ? error.message : 'Validation failed'
        })
      );
    }
  }, [dataText, schemaText]);

  const input = (
    <Stack spacing={2}>
      <ToolCodeInput
        title={t('jsonSchemaValidator.dataTitle')}
        value={dataText}
        onChange={setDataText}
        language="json"
      />
      <ToolCodeInput
        title={t('jsonSchemaValidator.schemaTitle')}
        value={schemaText}
        onChange={setSchemaText}
        language="json"
      />
    </Stack>
  );

  return (
    <Box>
      <ToolInputAndResult
        input={input}
        result={
          <ToolTextResult
            title={t('jsonSchemaValidator.resultTitle')}
            value={result}
            extension={'json'}
            keepSpecialCharacters
          />
        }
      />
    </Box>
  );
}
