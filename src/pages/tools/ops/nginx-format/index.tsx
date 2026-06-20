import { Box, Stack } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { formatNginxConfig } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const initialConfig = `events {
  worker_connections 1024;
}

http {
  server {
    listen 80;
    server_name example.local;

    location /api/ {
      proxy_pass http://app;
    }
  }
}
`;

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

export default function NginxFormat({ title }: ToolComponentProps) {
  const { t } = useTranslation('ops');
  const [content, setContent] = useState(initialConfig);
  const [output, setOutput] = useState('');
  const [validation, setValidation] = useState('');

  useEffect(() => {
    try {
      const result = formatNginxConfig({ content });
      setOutput(result.output);
      setValidation(
        formatJson({
          valid: result.valid,
          issues: result.issues,
          directiveCount: result.directiveCount,
          blockCount: result.blockCount,
          contexts: result.contexts,
          maxDepth: result.maxDepth
        })
      );
    } catch (error) {
      setOutput(content);
      setValidation(
        formatJson({
          valid: false,
          issues: [
            {
              severity: 'error',
              path: '$',
              message:
                error instanceof Error ? error.message : 'Nginx format failed',
              line: null,
              column: null
            }
          ]
        })
      );
    }
  }, [content]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('nginxFormat.inputTitle')}
            value={content}
            onChange={setContent}
            language="plaintext"
          />
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('nginxFormat.resultTitle')}
              value={output}
              extension={'conf'}
              keepSpecialCharacters
              monospace
            />
            <ToolTextResult
              title={t('nginxFormat.issuesTitle')}
              value={validation}
              extension={'json'}
              keepSpecialCharacters
              monospace
            />
          </Stack>
        }
      />
    </Box>
  );
}
