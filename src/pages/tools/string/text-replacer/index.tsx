import {
  Box,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initialValues, InitialValuesType } from './initialValues';
import { replaceText } from './service';

export default function Replacer() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<InitialValuesType['mode']>('text');
  const [searchValue, setSearchValue] = useState('');
  const [searchRegexp, setSearchRegexp] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(
      replaceText(
        {
          ...initialValues,
          mode,
          replaceValue,
          searchRegexp,
          searchValue
        },
        input
      )
    );
  }, [input, mode, replaceValue, searchRegexp, searchValue]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_, nextMode: InitialValuesType['mode'] | null) => {
                if (nextMode) {
                  setMode(nextMode);
                }
              }}
            >
              <ToggleButton value="text">
                {t('textReplacer.textMode')}
              </ToggleButton>
              <ToggleButton value="regexp">
                {t('textReplacer.regexMode')}
              </ToggleButton>
            </ToggleButtonGroup>
            {mode === 'text' ? (
              <TextField
                label={t('textReplacer.searchLabel')}
                size="small"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            ) : (
              <TextField
                label={t('textReplacer.regexLabel')}
                size="small"
                value={searchRegexp}
                onChange={(event) => setSearchRegexp(event.target.value)}
              />
            )}
            <TextField
              label={t('textReplacer.replacementLabel')}
              placeholder={t('textReplacer.newTextPlaceholder')}
              size="small"
              value={replaceValue}
              onChange={(event) => setReplaceValue(event.target.value)}
            />
            <ToolTextInput
              title={t('textReplacer.inputTitle')}
              value={input}
              onChange={setInput}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!input}
            keepSpecialCharacters
            monospace
            title={t('textReplacer.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
