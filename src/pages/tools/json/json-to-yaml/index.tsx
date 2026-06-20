import { Box } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { jsonToYaml } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const initialJson = JSON.stringify(
  {
    service: 'private-toolbox',
    ports: [4317, 5173],
    features: {
      mcp: true,
      httpRequestInMcp: false
    }
  },
  null,
  2
);

export default function JsonToYaml({ title }: ToolComponentProps) {
  const { t } = useTranslation('json');
  const [content, setContent] = useState(initialJson);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(jsonToYaml({ text: content }));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Conversion failed');
    }
  }, [content]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('jsonToYaml.inputTitle')}
            value={content}
            onChange={setContent}
            language="json"
          />
        }
        result={
          <ToolTextResult
            title={t('jsonToYaml.resultTitle')}
            value={result}
            extension={'yaml'}
            keepSpecialCharacters
            monospace
          />
        }
      />
    </Box>
  );
}
