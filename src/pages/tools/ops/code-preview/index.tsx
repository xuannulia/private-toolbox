import {
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type CodePreviewInput,
  type PreviewConsoleMessage,
  buildCodePreviewDocument,
  formatPreviewConsoleMessage
} from './service';

type CodePane = keyof CodePreviewInput;

const initialSnippet: CodePreviewInput = {
  html: `<main class="panel">
  <h1>Private Toolbox</h1>
  <button id="run">Run</button>
  <p id="result"></p>
</main>`,
  css: `.panel {
  max-width: 360px;
  padding: 16px;
  border: 1px solid #d7dde5;
  border-radius: 8px;
}

button {
  padding: 8px 12px;
}`,
  javascript: `document.getElementById('run').addEventListener('click', () => {
  const result = document.getElementById('result');
  result.textContent = new Date().toLocaleTimeString();
  console.log('clicked');
});`
};

const panes: CodePane[] = ['html', 'css', 'javascript'];

const paneLanguages: Record<CodePane, string> = {
  html: 'html',
  css: 'css',
  javascript: 'javascript'
};

export default function CodePreview() {
  const { t } = useTranslation('ops');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageIdRef = useRef(1);
  const [snippet, setSnippet] = useState<CodePreviewInput>(initialSnippet);
  const [activePane, setActivePane] = useState<CodePane>('html');
  const [autoRun, setAutoRun] = useState(true);
  const [renderedDocument, setRenderedDocument] = useState(() =>
    buildCodePreviewDocument(initialSnippet)
  );
  const [messages, setMessages] = useState<PreviewConsoleMessage[]>([]);

  const previewDocument = useMemo(
    () => buildCodePreviewDocument(snippet),
    [snippet]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.source !== 'private-toolbox-code-preview') return;

      const message = formatPreviewConsoleMessage(
        event.data.level,
        event.data.values,
        messageIdRef.current
      );

      if (!message) return;

      messageIdRef.current += 1;
      setMessages((current) => [...current.slice(-99), message]);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (autoRun) setRenderedDocument(previewDocument);
  }, [autoRun, previewDocument]);

  useEffect(() => {
    setMessages([]);
  }, [renderedDocument]);

  const updateSnippet = (pane: CodePane, value: string) => {
    setSnippet((current) => ({
      ...current,
      [pane]: value
    }));
  };

  const runPreview = () => {
    setRenderedDocument(previewDocument);
  };

  const input = (
    <Box>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Tabs
            value={activePane}
            onChange={(_, value: CodePane) => setActivePane(value)}
            variant="scrollable"
            sx={{
              minHeight: 40,
              flex: 1,
              '& .MuiTab-root': {
                minHeight: 40,
                px: 1.5
              }
            }}
          >
            {panes.map((pane) => (
              <Tab
                key={pane}
                value={pane}
                label={t(`codePreview.panes.${pane}`)}
              />
            ))}
          </Tabs>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={autoRun ? 'auto' : 'manual'}
            onChange={(_, value: 'auto' | 'manual' | null) => {
              if (value) setAutoRun(value === 'auto');
            }}
            sx={{
              flexShrink: 0,
              '& .MuiToggleButton-root': {
                px: 2,
                whiteSpace: 'nowrap'
              }
            }}
          >
            <ToggleButton value="auto">
              {t('codePreview.runModes.auto')}
            </ToggleButton>
            <ToggleButton value="manual">
              {t('codePreview.runModes.manual')}
            </ToggleButton>
          </ToggleButtonGroup>
          {!autoRun && (
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={runPreview}
              sx={{ flexShrink: 0 }}
            >
              {t('codePreview.run')}
            </Button>
          )}
        </Stack>
        <ToolCodeInput
          title={t(`codePreview.panes.${activePane}`)}
          value={snippet[activePane]}
          onChange={(value) => updateSnippet(activePane, value)}
          language={paneLanguages[activePane]}
        />
      </Stack>
    </Box>
  );

  return (
    <ToolInputAndResult
      input={input}
      result={
        <Stack spacing={2}>
          <Box>
            <Typography mb={1} fontSize={14} fontWeight={700}>
              {t('codePreview.previewTitle')}
            </Typography>
            <Box
              component="iframe"
              ref={iframeRef}
              title={t('codePreview.previewTitle')}
              sandbox="allow-scripts"
              srcDoc={renderedDocument}
              sx={{
                width: '100%',
                height: 360,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.paper'
              }}
            />
          </Box>
          <Box>
            <Typography mb={1} fontSize={14} fontWeight={700}>
              {t('codePreview.consoleTitle')}
            </Typography>
            <Box
              sx={{
                height: 180,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.paper',
                fontFamily: 'monospace',
                fontSize: 13,
                p: 1
              }}
            >
              {messages.length === 0 ? (
                <Typography fontSize={13} color="text.secondary">
                  {t('codePreview.emptyConsole')}
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        color:
                          message.level === 'error'
                            ? 'error.main'
                            : message.level === 'warn'
                              ? 'warning.main'
                              : 'text.primary',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      [{message.level}] {message.text}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </Stack>
      }
    />
  );
}
