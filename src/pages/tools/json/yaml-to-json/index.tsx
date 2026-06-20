import { Box } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { yamlToJson } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const initialYaml = `service: private-toolbox
ports:
  - 4317
  - 5173
features:
  mcp: true
  httpRequestInMcp: false
`;

export default function YamlToJson({ title }: ToolComponentProps) {
  const { t } = useTranslation('json');
  const [content, setContent] = useState(initialYaml);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(yamlToJson({ text: content }));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Conversion failed');
    }
  }, [content]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('yamlToJson.inputTitle')}
            value={content}
            onChange={setContent}
            language="yaml"
          />
        }
        result={
          <ToolTextResult
            title={t('yamlToJson.resultTitle')}
            value={result}
            extension={'json'}
            keepSpecialCharacters
            monospace
          />
        }
      />
    </Box>
  );
}
