import {
  Box,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  explainRegex,
  replaceRegex,
  testRegex,
  visualizeRegex
} from '@private-toolbox/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { regexPresets, type RegexPreset } from './presets';

const formatResult = (value: unknown): string => JSON.stringify(value, null, 2);

type RegexGraph = ReturnType<typeof visualizeRegex>;
type RegexTestResult = ReturnType<typeof testRegex>;
type RegexReplaceResult = ReturnType<typeof replaceRegex>;
type RegexPresetId = (typeof regexPresets)[number]['id'] | 'custom';

const initialPreset = regexPresets[0];
const maxPreviewMatches = 100;

type HighlightSegment = {
  text: string;
  matched: boolean;
};

const buildHighlightSegments = (
  text: string,
  matches: RegexTestResult['matches']
): HighlightSegment[] => {
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const match of matches.slice(0, maxPreviewMatches)) {
    const start = match.index;
    const end = start + match.match.length;

    if (match.match.length === 0 || start < cursor || end > text.length) {
      continue;
    }

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), matched: false });
    }

    segments.push({ text: text.slice(start, end), matched: true });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matched: false });
  }

  return segments.length > 0 ? segments : [{ text, matched: false }];
};

function RegexGraphView({ graph }: { graph: RegexGraph | null }) {
  const { t } = useTranslation('string');

  if (!graph?.valid || graph.nodes.length === 0) return null;

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        backgroundColor: 'background.paper'
      }}
    >
      <Stack spacing={1}>
        <Typography fontWeight={700}>{t('regexToolkit.graphTitle')}</Typography>
        <Box sx={{ overflowX: 'auto', pb: 0.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {graph.nodes.map((node, index) => (
              <Stack
                key={node.id}
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Box
                  sx={{
                    minWidth: 92,
                    maxWidth: 180,
                    border: 1,
                    borderColor:
                      node.type === 'boundary' ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    px: 1,
                    py: 0.75,
                    backgroundColor:
                      node.type === 'boundary'
                        ? 'action.hover'
                        : 'background.default'
                  }}
                >
                  <Typography fontSize={12} color="text.secondary" noWrap>
                    {node.label}
                  </Typography>
                  <Typography fontFamily="monospace" fontSize={13} noWrap>
                    {node.value || node.label}
                  </Typography>
                </Box>
                {index < graph.nodes.length - 1 && (
                  <Typography color="text.secondary">-&gt;</Typography>
                )}
              </Stack>
            ))}
          </Stack>
        </Box>
        {graph.warnings.map((warning) => (
          <Chip
            key={warning}
            label={warning}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          />
        ))}
      </Stack>
    </Box>
  );
}

function RegexMatchPreview({
  text,
  testResult,
  replaceResult
}: {
  text: string;
  testResult: RegexTestResult | null;
  replaceResult: RegexReplaceResult | null;
}) {
  const { t } = useTranslation('string');

  if (!testResult || !replaceResult) return null;

  const segments = buildHighlightSegments(text, testResult.matches);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        backgroundColor: 'background.paper'
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography fontWeight={700}>
            {t('regexToolkit.matchPreviewTitle')}
          </Typography>
          <Chip
            size="small"
            label={t('regexToolkit.matchCount', {
              count: testResult.matchCount
            })}
            color={testResult.matched ? 'primary' : 'default'}
            variant={testResult.matched ? 'filled' : 'outlined'}
          />
        </Stack>
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            px: 1,
            py: 0.75,
            maxHeight: 220,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'monospace',
            fontSize: 13,
            backgroundColor: 'background.default'
          }}
        >
          {testResult.matched ? (
            segments.map((segment, index) =>
              segment.matched ? (
                <Box
                  key={`${segment.text}-${index}`}
                  component="mark"
                  sx={{
                    px: 0.25,
                    borderRadius: 0.5,
                    color: 'text.primary',
                    backgroundColor: 'warning.light'
                  }}
                >
                  {segment.text}
                </Box>
              ) : (
                <Box key={`${segment.text}-${index}`} component="span">
                  {segment.text}
                </Box>
              )
            )
          ) : (
            <Typography color="text.secondary" fontSize={13}>
              {t('regexToolkit.noMatches')}
            </Typography>
          )}
        </Box>
        <Box>
          <Typography fontSize={12} color="text.secondary" sx={{ mb: 0.5 }}>
            {t('regexToolkit.replacePreviewTitle')}
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              px: 1,
              py: 0.75,
              maxHeight: 180,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              fontSize: 13,
              backgroundColor: 'background.default'
            }}
          >
            {replaceResult.output || t('regexToolkit.emptyResult')}
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

export default function RegexToolkit() {
  const { t } = useTranslation('string');
  const [presetId, setPresetId] = useState<RegexPresetId>(initialPreset.id);
  const [pattern, setPattern] = useState<string>(initialPreset.pattern);
  const [flags, setFlags] = useState<string>(initialPreset.flags);
  const [text, setText] = useState<string>(initialPreset.text);
  const [replacement, setReplacement] = useState<string>(
    initialPreset.replacement
  );
  const [result, setResult] = useState('');
  const [graph, setGraph] = useState<RegexGraph | null>(null);
  const [testResult, setTestResult] = useState<RegexTestResult | null>(null);
  const [replaceResult, setReplaceResult] = useState<RegexReplaceResult | null>(
    null
  );

  const markCustom = () => setPresetId('custom');
  const applyPreset = (preset: RegexPreset) => {
    setPresetId(preset.id as RegexPresetId);
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setReplacement(preset.replacement);
    setText(preset.text);
  };

  useEffect(() => {
    try {
      const explain = explainRegex({ pattern, flags });
      const visualize = visualizeRegex({ pattern, flags });
      setGraph(visualize);

      if (!explain.valid) {
        setTestResult(null);
        setReplaceResult(null);
        setResult(formatResult({ explain }));
        return;
      }

      const test = testRegex({ pattern, flags, text });
      const replace = replaceRegex({ pattern, flags, text, replacement });

      setTestResult(test);
      setReplaceResult(replace);

      setResult(
        formatResult({
          test,
          replace,
          explain,
          visualize
        })
      );
    } catch (error) {
      setGraph(null);
      setTestResult(null);
      setReplaceResult(null);
      setResult(
        formatResult({
          error: error instanceof Error ? error.message : 'Regex failed'
        })
      );
    }
  }, [pattern, flags, text, replacement]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <TextField
              select
              label={t('regexToolkit.presetTitle')}
              value={presetId}
              onChange={(event) => {
                const preset = regexPresets.find(
                  (item) => item.id === event.target.value
                );

                if (preset) {
                  applyPreset(preset);
                }
              }}
              fullWidth
            >
              <MenuItem value="custom" disabled>
                {t('regexToolkit.customPreset')}
              </MenuItem>
              {regexPresets.map((preset) => (
                <MenuItem key={preset.id} value={preset.id}>
                  {t(`regexToolkit.presets.${preset.id}`)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('regexToolkit.patternTitle')}
              value={pattern}
              onChange={(event) => {
                markCustom();
                setPattern(event.target.value);
              }}
              fullWidth
            />
            <TextField
              label={t('regexToolkit.flagsTitle')}
              value={flags}
              onChange={(event) => {
                markCustom();
                setFlags(event.target.value);
              }}
              fullWidth
            />
            <TextField
              label={t('regexToolkit.replacementTitle')}
              value={replacement}
              onChange={(event) => {
                markCustom();
                setReplacement(event.target.value);
              }}
              fullWidth
            />
            <ToolTextInput
              title={t('regexToolkit.textTitle')}
              value={text}
              onChange={(value) => {
                markCustom();
                setText(value);
              }}
            />
          </Stack>
        }
        result={
          <Stack spacing={2}>
            <RegexMatchPreview
              text={text}
              testResult={testResult}
              replaceResult={replaceResult}
            />
            <RegexGraphView graph={graph} />
            <ToolTextResult
              title={t('regexToolkit.resultTitle')}
              value={result}
              extension={'json'}
              keepSpecialCharacters
            />
          </Stack>
        }
      />
    </Box>
  );
}
