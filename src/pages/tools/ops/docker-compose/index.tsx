import { Box, Stack } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { formatDockerCompose } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const initialCompose = `services:
  app:
    image: nginx:alpine
    ports:
      - "8080:80"
    environment:
      NODE_ENV: production
  worker:
    build: .
    command: npm start
volumes:
  data:
`;

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

export default function DockerCompose({ title }: ToolComponentProps) {
  const { t } = useTranslation('ops');
  const [content, setContent] = useState(initialCompose);
  const [output, setOutput] = useState('');
  const [validation, setValidation] = useState('');

  useEffect(() => {
    try {
      const result = formatDockerCompose({ content });
      setOutput(result.output);
      setValidation(
        formatJson({
          valid: result.valid,
          issues: result.issues,
          serviceNames: result.serviceNames,
          networkNames: result.networkNames,
          volumeNames: result.volumeNames,
          configNames: result.configNames,
          secretNames: result.secretNames
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
                error instanceof Error ? error.message : 'Compose validation failed',
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
            title={t('dockerCompose.inputTitle')}
            value={content}
            onChange={setContent}
            language="yaml"
          />
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('dockerCompose.resultTitle')}
              value={output}
              extension={'yaml'}
              keepSpecialCharacters
              monospace
            />
            <ToolTextResult
              title={t('dockerCompose.issuesTitle')}
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
