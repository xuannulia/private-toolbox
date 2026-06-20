import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField
} from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { type JsonToTypesLanguage } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createJsonTypesText,
  jsonToTypesExtensions,
  jsonToTypesLanguages
} from './service';

const initialJson = JSON.stringify(
  [
    {
      id: 1,
      name: 'Ada',
      active: true,
      profile: {
        email: 'ada@example.test',
        score: 99.5
      },
      tags: ['math', 'logic']
    },
    {
      id: 2,
      name: 'Grace',
      profile: {
        email: 'grace@example.test'
      }
    }
  ],
  null,
  2
);

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Type generation failed';

export default function JsonToTypes({ title }: ToolComponentProps) {
  const { t } = useTranslation('json');
  const [text, setText] = useState(initialJson);
  const [language, setLanguage] = useState<JsonToTypesLanguage>('typescript');
  const [rootName, setRootName] = useState('User');
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(createJsonTypesText({ text, language, rootName }));
    } catch (error) {
      setResult(formatError(error));
    }
  }, [text, language, rootName]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('jsonToTypes.language')}</InputLabel>
                <Select
                  label={t('jsonToTypes.language')}
                  value={language}
                  onChange={(event) =>
                    setLanguage(event.target.value as JsonToTypesLanguage)
                  }
                >
                  {jsonToTypesLanguages.map((item) => (
                    <MenuItem key={item} value={item}>
                      {t(`jsonToTypes.languages.${item}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label={t('jsonToTypes.rootName')}
                value={rootName}
                onChange={(event) => setRootName(event.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            <ToolCodeInput
              title={t('jsonToTypes.inputTitle')}
              value={text}
              onChange={setText}
              language="json"
            />
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('jsonToTypes.resultTitle', { title })}
            value={result}
            extension={jsonToTypesExtensions[language]}
            keepSpecialCharacters
            monospace
          />
        }
      />
    </Box>
  );
}
