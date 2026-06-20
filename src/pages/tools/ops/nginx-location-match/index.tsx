import { Box, Stack, TextField } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createNginxLocationMatchText,
  matchNginxLocationForTool
} from './service';

const initialConfig = `server {
  listen 80;
  server_name example.local;

  location = /health {
    return 200;
  }

  location ^~ /assets/ {
    root /srv/public;
  }

  location /api/ {
    proxy_pass http://api;
  }

  location ~* \\.(png|jpg)$ {
    expires 1h;
  }

  location / {
    try_files $uri $uri/ =404;
  }
}
`;

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      selected: null,
      issues: [
        {
          severity: 'error',
          path: '$',
          message:
            error instanceof Error
              ? error.message
              : 'Nginx location match failed',
          line: null,
          column: null
        }
      ]
    },
    null,
    2
  );

export default function NginxLocationMatch() {
  const { t } = useTranslation('ops');
  const [content, setContent] = useState(initialConfig);
  const [uri, setUri] = useState('/api/avatar.jpg');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    try {
      const result = matchNginxLocationForTool({ content, uri });
      setSummary(result?.selected?.raw ?? t('nginxLocationMatch.noMatch'));
      setDetails(createNginxLocationMatchText({ content, uri }));
    } catch (error) {
      setSummary(t('nginxLocationMatch.error'));
      setDetails(formatError(error));
    }
  }, [content, t, uri]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label={t('nginxLocationMatch.uri')}
              value={uri}
              onChange={(event) => setUri(event.target.value)}
              sx={{ backgroundColor: 'background.paper' }}
            />
            <ToolCodeInput
              title={t('nginxLocationMatch.configTitle')}
              value={content}
              onChange={setContent}
              language="plaintext"
            />
          </Stack>
        }
        result={
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label={t('nginxLocationMatch.selected')}
              value={summary}
              InputProps={{ readOnly: true }}
              sx={{ backgroundColor: 'background.paper' }}
            />
            <ToolTextResult
              title={t('nginxLocationMatch.resultTitle')}
              value={details}
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
