import {
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  generateNginxSnippet,
  type NginxSnippetKind
} from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Nginx snippet generation failed';

export default function NginxSnippet({ title }: ToolComponentProps) {
  const { t } = useTranslation('ops');
  const [kind, setKind] = useState<NginxSnippetKind>('reverse_proxy');
  const [serverName, setServerName] = useState('example.com');
  const [listenPort, setListenPort] = useState(80);
  const [upstreamUrl, setUpstreamUrl] = useState('http://127.0.0.1:3000');
  const [root, setRoot] = useState('/var/www/site');
  const [clientMaxBodySize, setClientMaxBodySize] = useState('20m');
  const [enableWebsocket, setEnableWebsocket] = useState(false);
  const [includeSecurityHeaders, setIncludeSecurityHeaders] = useState(true);
  const [enableGzip, setEnableGzip] = useState(true);
  const [accessLog, setAccessLog] = useState(true);
  const [output, setOutput] = useState('');

  useEffect(() => {
    try {
      const result = generateNginxSnippet({
        kind,
        serverName,
        listenPort,
        upstreamUrl,
        root,
        clientMaxBodySize,
        enableWebsocket,
        includeSecurityHeaders,
        enableGzip,
        accessLog
      });
      setOutput(result.output);
    } catch (error) {
      setOutput(formatError(error));
    }
  }, [
    accessLog,
    clientMaxBodySize,
    enableGzip,
    enableWebsocket,
    includeSecurityHeaders,
    kind,
    listenPort,
    root,
    serverName,
    upstreamUrl
  ]);

  const showUpstream = kind === 'reverse_proxy';
  const showRoot = kind === 'static_site' || kind === 'spa';
  const showCommonOptions = kind !== 'https_redirect';

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label={t('nginxSnippet.kind')}
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as NginxSnippetKind)
              }
              sx={{ backgroundColor: 'background.paper' }}
            >
              <MenuItem value="reverse_proxy">
                {t('nginxSnippet.kinds.reverseProxy')}
              </MenuItem>
              <MenuItem value="static_site">
                {t('nginxSnippet.kinds.staticSite')}
              </MenuItem>
              <MenuItem value="spa">{t('nginxSnippet.kinds.spa')}</MenuItem>
              <MenuItem value="https_redirect">
                {t('nginxSnippet.kinds.httpsRedirect')}
              </MenuItem>
            </TextField>
            <TextField
              fullWidth
              size="small"
              label={t('nginxSnippet.serverName')}
              value={serverName}
              onChange={(event) => setServerName(event.target.value)}
              sx={{ backgroundColor: 'background.paper' }}
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label={t('nginxSnippet.listenPort')}
              value={listenPort}
              onChange={(event) => setListenPort(Number(event.target.value))}
              inputProps={{ min: 1, max: 65535 }}
              sx={{ backgroundColor: 'background.paper' }}
            />
            {showUpstream && (
              <TextField
                fullWidth
                size="small"
                label={t('nginxSnippet.upstreamUrl')}
                value={upstreamUrl}
                onChange={(event) => setUpstreamUrl(event.target.value)}
                sx={{ backgroundColor: 'background.paper' }}
              />
            )}
            {showRoot && (
              <TextField
                fullWidth
                size="small"
                label={t('nginxSnippet.root')}
                value={root}
                onChange={(event) => setRoot(event.target.value)}
                sx={{ backgroundColor: 'background.paper' }}
              />
            )}
            {showCommonOptions && (
              <>
                <TextField
                  fullWidth
                  size="small"
                  label={t('nginxSnippet.clientMaxBodySize')}
                  value={clientMaxBodySize}
                  onChange={(event) => setClientMaxBodySize(event.target.value)}
                  sx={{ backgroundColor: 'background.paper' }}
                />
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={includeSecurityHeaders}
                        onChange={(event) =>
                          setIncludeSecurityHeaders(event.target.checked)
                        }
                      />
                    }
                    label={t('nginxSnippet.securityHeaders')}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={enableGzip}
                        onChange={(event) =>
                          setEnableGzip(event.target.checked)
                        }
                      />
                    }
                    label={t('nginxSnippet.gzip')}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={accessLog}
                        onChange={(event) => setAccessLog(event.target.checked)}
                      />
                    }
                    label={t('nginxSnippet.accessLog')}
                  />
                  {showUpstream && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={enableWebsocket}
                          onChange={(event) =>
                            setEnableWebsocket(event.target.checked)
                          }
                        />
                      }
                      label={t('nginxSnippet.websocket')}
                    />
                  )}
                </Stack>
              </>
            )}
          </Stack>
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('nginxSnippet.resultTitle')}
              value={output}
              extension={'conf'}
              keepSpecialCharacters
              monospace
            />
          </Stack>
        }
      />
    </Box>
  );
}
