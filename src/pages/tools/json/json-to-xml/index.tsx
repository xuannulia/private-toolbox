import {
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField
} from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { convertJsonToXml } from './service';

type IndentationType = 'space' | 'tab' | 'none';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Invalid JSON input';

export default function JsonToXml() {
  const { t } = useTranslation('json');
  const [input, setInput] = useState('');
  const [indentationType, setIndentationType] =
    useState<IndentationType>('space');
  const [addMetaTag, setAddMetaTag] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input.trim()) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(convertJsonToXml(input, { indentationType, addMetaTag }));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [addMetaTag, indentationType, input]);

  const output = error ? t('jsonToXml.invalidInput', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolCodeInput
              title={t('jsonToXml.inputTitle')}
              value={input}
              onChange={setInput}
              language="json"
            />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <TextField
                select
                fullWidth
                size="small"
                label={t('jsonToXml.indentation')}
                value={indentationType}
                onChange={(event) =>
                  setIndentationType(event.target.value as IndentationType)
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="space">{t('jsonToXml.useSpaces')}</MenuItem>
                <MenuItem value="tab">{t('jsonToXml.useTabs')}</MenuItem>
                <MenuItem value="none">{t('jsonToXml.noIndentation')}</MenuItem>
              </TextField>
              <FormControlLabel
                sx={{ m: 0, minWidth: 160 }}
                control={
                  <Switch
                    checked={addMetaTag}
                    onChange={(event) => setAddMetaTag(event.target.checked)}
                    size="small"
                  />
                }
                label={t('jsonToXml.addMetaTag')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="xml"
            keepSpecialCharacters
            monospace
            title={t('jsonToXml.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
