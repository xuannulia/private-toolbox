import {
  Box,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  type BannerAnsiColor,
  type BannerCommentStyle,
  type BannerFont,
  type BannerOutputMode,
  generateAsciiBanner
} from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Banner generation failed';

const resultExtensionByMode: Record<BannerOutputMode, string> = {
  text: 'txt',
  shell: 'sh',
  javascript: 'js',
  python: 'py',
  go: 'go',
  java: 'java'
};

const previewColorByAnsiColor: Record<BannerAnsiColor, string | undefined> = {
  none: undefined,
  gray: '#6b7280',
  red: '#d32f2f',
  green: '#2e7d32',
  yellow: '#ed6c02',
  blue: '#1976d2',
  magenta: '#9c27b0',
  cyan: '#0288d1',
  white: '#f5f5f5'
};

export default function AsciiBanner({ title }: ToolComponentProps) {
  const { t } = useTranslation('string');
  const [text, setText] = useState('Good\n工具');
  const [font, setFont] = useState<BannerFont>('block');
  const [fillCharacter, setFillCharacter] = useState('#');
  const [commentStyle, setCommentStyle] = useState<BannerCommentStyle>('none');
  const [outputMode, setOutputMode] = useState<BannerOutputMode>('text');
  const [ansiColor, setAnsiColor] = useState<BannerAnsiColor>('none');
  const [result, setResult] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    try {
      const generated = generateAsciiBanner({
        text,
        font,
        fillCharacter,
        commentStyle,
        outputMode,
        ansiColor
      });

      setResult(generated.output);
      setPreview(generated.bannerOutput);
    } catch (error) {
      setResult(formatError(error));
      setPreview('');
    }
  }, [ansiColor, text, font, fillCharacter, commentStyle, outputMode]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('asciiBanner.inputTitle')}
              value={text}
              onChange={setText}
            />
            <TextField
              select
              label={t('asciiBanner.fontTitle')}
              value={font}
              onChange={(event) => setFont(event.target.value as BannerFont)}
              fullWidth
            >
              <MenuItem value="block">{t('asciiBanner.fontBlock')}</MenuItem>
              <MenuItem value="compact">
                {t('asciiBanner.fontCompact')}
              </MenuItem>
              <MenuItem value="modular">
                {t('asciiBanner.fontModular')}
              </MenuItem>
            </TextField>
            <TextField
              label={t('asciiBanner.fillTitle')}
              value={fillCharacter}
              onChange={(event) => setFillCharacter(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label={t('asciiBanner.outputTitle')}
              value={outputMode}
              onChange={(event) =>
                setOutputMode(event.target.value as BannerOutputMode)
              }
              fullWidth
            >
              <MenuItem value="text">{t('asciiBanner.outputText')}</MenuItem>
              <MenuItem value="shell">{t('asciiBanner.outputShell')}</MenuItem>
              <MenuItem value="javascript">
                {t('asciiBanner.outputJavascript')}
              </MenuItem>
              <MenuItem value="python">
                {t('asciiBanner.outputPython')}
              </MenuItem>
              <MenuItem value="go">{t('asciiBanner.outputGo')}</MenuItem>
              <MenuItem value="java">{t('asciiBanner.outputJava')}</MenuItem>
            </TextField>
            <TextField
              select
              label={t('asciiBanner.ansiColorTitle')}
              value={ansiColor}
              onChange={(event) =>
                setAnsiColor(event.target.value as BannerAnsiColor)
              }
              fullWidth
            >
              <MenuItem value="none">{t('asciiBanner.ansiNone')}</MenuItem>
              <MenuItem value="gray">{t('asciiBanner.ansiGray')}</MenuItem>
              <MenuItem value="red">{t('asciiBanner.ansiRed')}</MenuItem>
              <MenuItem value="green">{t('asciiBanner.ansiGreen')}</MenuItem>
              <MenuItem value="yellow">{t('asciiBanner.ansiYellow')}</MenuItem>
              <MenuItem value="blue">{t('asciiBanner.ansiBlue')}</MenuItem>
              <MenuItem value="magenta">
                {t('asciiBanner.ansiMagenta')}
              </MenuItem>
              <MenuItem value="cyan">{t('asciiBanner.ansiCyan')}</MenuItem>
              <MenuItem value="white">{t('asciiBanner.ansiWhite')}</MenuItem>
            </TextField>
            <TextField
              select
              label={t('asciiBanner.commentTitle')}
              value={commentStyle}
              onChange={(event) =>
                setCommentStyle(event.target.value as BannerCommentStyle)
              }
              fullWidth
            >
              <MenuItem value="none">{t('asciiBanner.commentNone')}</MenuItem>
              <MenuItem value="hash">{t('asciiBanner.commentHash')}</MenuItem>
              <MenuItem value="slash">{t('asciiBanner.commentSlash')}</MenuItem>
              <MenuItem value="block">{t('asciiBanner.commentBlock')}</MenuItem>
            </TextField>
          </Stack>
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('asciiBanner.resultTitle')}
              value={result}
              extension={resultExtensionByMode[outputMode]}
              keepSpecialCharacters
              monospace
            />
            {preview && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('asciiBanner.previewTitle')}
                </Typography>
                <Paper
                  variant="outlined"
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: 'grey.900',
                    color: previewColorByAnsiColor[ansiColor] ?? '#f5f5f5',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    lineHeight: 1.45,
                    overflowX: 'auto',
                    whiteSpace: 'pre'
                  }}
                >
                  {preview}
                </Paper>
              </Box>
            )}
          </Stack>
        }
      />
    </Box>
  );
}
