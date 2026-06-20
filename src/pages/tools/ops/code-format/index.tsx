import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { type CodeLanguage } from '@private-toolbox/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type CodeOperation,
  codeExtensions,
  monacoLanguages,
  runCodeTool
} from './service';

const examples: Record<CodeLanguage, string> = {
  html: `<main><h1>Private Toolbox</h1><p>Local first tools.</p></main>`,
  css: `.panel{color:#222;background:white}.panel strong{font-weight:700}`,
  javascript: `function greet(name){const value=name||"toolbox";return "Hello, "+value}`
};

const languageOptions: CodeLanguage[] = ['html', 'css', 'javascript'];

export default function CodeFormat() {
  const { t } = useTranslation('ops');
  const [language, setLanguage] = useState<CodeLanguage>('javascript');
  const [operation, setOperation] = useState<CodeOperation>('format');
  const [input, setInput] = useState(examples.javascript);
  const [output, setOutput] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!input.trim()) {
      setOutput('');
      setSummary('');
      return;
    }

    setLoading(true);
    runCodeTool({
      operation,
      language,
      text: input
    })
      .then((result) => {
        if (!active) return;
        setOutput(result.text);
        setSummary(result.summary);
      })
      .catch((error) => {
        if (!active) return;
        setOutput(error instanceof Error ? error.message : 'Code failed');
        setSummary('');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [input, language, operation]);

  const handleLanguageChange = (nextLanguage: CodeLanguage) => {
    setLanguage(nextLanguage);
    setInput(examples[nextLanguage]);
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('codeFormat.language')}</InputLabel>
                <Select
                  label={t('codeFormat.language')}
                  value={language}
                  onChange={(event) =>
                    handleLanguageChange(event.target.value as CodeLanguage)
                  }
                >
                  {languageOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {t(`codeFormat.languages.${option}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={operation}
                onChange={(_, value: CodeOperation | null) => {
                  if (value) setOperation(value);
                }}
                sx={{
                  flexShrink: 0,
                  '& .MuiToggleButton-root': {
                    px: 2,
                    whiteSpace: 'nowrap'
                  }
                }}
              >
                <ToggleButton value="format">
                  {t('codeFormat.operations.format')}
                </ToggleButton>
                <ToggleButton value="minify">
                  {t('codeFormat.operations.minify')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <ToolCodeInput
              title={t('codeFormat.inputTitle')}
              value={input}
              onChange={setInput}
              language={monacoLanguages[language]}
            />
          </Stack>
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('codeFormat.resultTitle')}
              value={output}
              extension={codeExtensions[language]}
              keepSpecialCharacters
              loading={loading}
              monospace
            />
            <ToolTextResult
              title={t('codeFormat.summaryTitle')}
              value={summary}
              extension="json"
              keepSpecialCharacters
              monospace
            />
          </Stack>
        }
      />
    </Box>
  );
}
