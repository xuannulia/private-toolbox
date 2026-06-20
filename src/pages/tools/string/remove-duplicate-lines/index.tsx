import {
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import removeDuplicateLines, {
  type DuplicateKeyMode,
  type DuplicateRemovalMode,
  type NewlineOption
} from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Remove duplicate lines failed';

export default function RemoveDuplicateLines() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<DuplicateRemovalMode>('all');
  const [keyMode, setKeyMode] = useState<DuplicateKeyMode>('line');
  const [newlines, setNewlines] = useState<NewlineOption>('filter');
  const [sortLines, setSortLines] = useState(false);
  const [trimTextLines, setTrimTextLines] = useState(false);
  const [fieldDelimiter, setFieldDelimiter] = useState(',');
  const [keyIndex, setKeyIndex] = useState('1');
  const [keyRegex, setKeyRegex] = useState('');
  const [keyRegexFlags, setKeyRegexFlags] = useState('g');
  const [keyRegexGroup, setKeyRegexGroup] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      const numericKeyIndex =
        keyIndex.trim() === '' ? undefined : Number(keyIndex);

      setResult(
        removeDuplicateLines(input, {
          mode,
          keyMode,
          newlines,
          sortLines,
          trimTextLines,
          fieldDelimiter,
          keyIndex: numericKeyIndex,
          keyRegex,
          keyRegexFlags,
          keyRegexGroup
        })
      );
    } catch (error) {
      setResult(formatError(error));
    }
  }, [
    fieldDelimiter,
    input,
    keyIndex,
    keyMode,
    keyRegex,
    keyRegexFlags,
    keyRegexGroup,
    mode,
    newlines,
    sortLines,
    trimTextLines
  ]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('removeDuplicateLines.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Stack spacing={1.5}>
              <TextField
                select
                fullWidth
                size="small"
                label={t('removeDuplicateLines.modeTitle')}
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as DuplicateRemovalMode)
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="all">
                  {t('removeDuplicateLines.modeAll')}
                </MenuItem>
                <MenuItem value="consecutive">
                  {t('removeDuplicateLines.modeConsecutive')}
                </MenuItem>
                <MenuItem value="unique">
                  {t('removeDuplicateLines.modeUnique')}
                </MenuItem>
              </TextField>

              <TextField
                select
                fullWidth
                size="small"
                label={t('removeDuplicateLines.keyModeTitle')}
                value={keyMode}
                onChange={(event) =>
                  setKeyMode(event.target.value as DuplicateKeyMode)
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="line">
                  {t('removeDuplicateLines.keyModeLine')}
                </MenuItem>
                <MenuItem value="word">
                  {t('removeDuplicateLines.keyModeWord')}
                </MenuItem>
                <MenuItem value="field">
                  {t('removeDuplicateLines.keyModeField')}
                </MenuItem>
                <MenuItem value="regex">
                  {t('removeDuplicateLines.keyModeRegex')}
                </MenuItem>
              </TextField>

              {(keyMode === 'word' || keyMode === 'field') && (
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={t('removeDuplicateLines.keyIndexTitle')}
                  value={keyIndex}
                  onChange={(event) => setKeyIndex(event.target.value)}
                  inputProps={{ min: 1, max: 1000, step: 1 }}
                  sx={{ backgroundColor: 'background.paper' }}
                />
              )}

              {keyMode === 'field' && (
                <TextField
                  fullWidth
                  size="small"
                  label={t('removeDuplicateLines.fieldDelimiterTitle')}
                  value={fieldDelimiter}
                  onChange={(event) => setFieldDelimiter(event.target.value)}
                  sx={{ backgroundColor: 'background.paper' }}
                />
              )}

              {keyMode === 'regex' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    size="small"
                    label={t('removeDuplicateLines.keyRegexTitle')}
                    value={keyRegex}
                    onChange={(event) => setKeyRegex(event.target.value)}
                    sx={{ backgroundColor: 'background.paper' }}
                  />
                  <TextField
                    size="small"
                    label={t('removeDuplicateLines.keyRegexFlagsTitle')}
                    value={keyRegexFlags}
                    onChange={(event) => setKeyRegexFlags(event.target.value)}
                    sx={{ backgroundColor: 'background.paper', width: 120 }}
                  />
                  <TextField
                    size="small"
                    label={t('removeDuplicateLines.keyRegexGroupTitle')}
                    value={keyRegexGroup}
                    onChange={(event) => setKeyRegexGroup(event.target.value)}
                    sx={{ backgroundColor: 'background.paper', width: 120 }}
                  />
                </Stack>
              )}

              <TextField
                select
                fullWidth
                size="small"
                label={t('removeDuplicateLines.newlinesTitle')}
                value={newlines}
                onChange={(event) =>
                  setNewlines(event.target.value as NewlineOption)
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="filter">
                  {t('removeDuplicateLines.newlinesFilter')}
                </MenuItem>
                <MenuItem value="preserve">
                  {t('removeDuplicateLines.newlinesPreserve')}
                </MenuItem>
                <MenuItem value="delete">
                  {t('removeDuplicateLines.newlinesDelete')}
                </MenuItem>
              </TextField>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={trimTextLines}
                      onChange={(event) =>
                        setTrimTextLines(event.target.checked)
                      }
                    />
                  }
                  label={t('removeDuplicateLines.trimLines')}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={sortLines}
                      onChange={(event) => setSortLines(event.target.checked)}
                    />
                  }
                  label={t('removeDuplicateLines.sortLines')}
                />
              </Stack>
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('removeDuplicateLines.resultTitle')}
            value={result}
            keepSpecialCharacters
            monospace
          />
        }
      />
    </Box>
  );
}
