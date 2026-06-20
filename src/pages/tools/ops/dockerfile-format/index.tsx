import { Box, Stack } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createDockerfileSummaryText,
  formatDockerfileForTool
} from './service';

const initialDockerfile = `FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci && \\
 npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
USER nginx
`;

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

export default function DockerfileFormat() {
  const { t } = useTranslation('ops');
  const [content, setContent] = useState(initialDockerfile);
  const [output, setOutput] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    try {
      const result = formatDockerfileForTool({ content, indent: 4 });
      setOutput(result?.output ?? '');
      setSummary(createDockerfileSummaryText({ content, indent: 4 }));
    } catch (error) {
      setOutput(content);
      setSummary(
        formatJson({
          valid: false,
          issues: [
            {
              severity: 'error',
              path: '$',
              message:
                error instanceof Error
                  ? error.message
                  : 'Dockerfile format failed',
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
            title={t('dockerfileFormat.inputTitle')}
            value={content}
            onChange={setContent}
            language="dockerfile"
          />
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('dockerfileFormat.resultTitle')}
              value={output}
              extension={'dockerfile'}
              keepSpecialCharacters
              monospace
            />
            <ToolTextResult
              title={t('dockerfileFormat.issuesTitle')}
              value={summary}
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
