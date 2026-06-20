import { Box } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { createJsonSchemaFromJson } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const initialData = JSON.stringify(
  {
    name: 'Ada',
    age: 36,
    active: true,
    tags: ['math', 'logic']
  },
  null,
  2
);

const formatResult = (value: unknown): string => JSON.stringify(value, null, 2);

export default function JsonSchemaFromJson({ title }: ToolComponentProps) {
  const { t } = useTranslation('json');
  const [dataText, setDataText] = useState(initialData);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(createJsonSchemaFromJson({ dataText }).schemaText);
    } catch (error) {
      setResult(
        formatResult({
          error:
            error instanceof Error ? error.message : 'Schema generation failed'
        })
      );
    }
  }, [dataText]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('jsonSchemaFromJson.inputTitle')}
            value={dataText}
            onChange={setDataText}
            language="json"
          />
        }
        result={
          <ToolTextResult
            title={t('jsonSchemaFromJson.resultTitle')}
            value={result}
            extension={'json'}
            keepSpecialCharacters
          />
        }
      />
    </Box>
  );
}
