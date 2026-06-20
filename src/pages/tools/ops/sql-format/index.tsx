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
import { type SqlDialect, type SqlKeywordCase } from '@private-toolbox/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type SqlOperation,
  isSqlDialect,
  runSqlTool,
  sqlDialectOptions,
  sqlKeywordCaseOptions
} from './service';

const initialSql = `select u.id, u.name, count(o.id) as orders
from users u
left join orders o on o.user_id = u.id
where u.active = 1
group by u.id, u.name
order by orders desc`;

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'SQL_FORMAT_ERROR',
      message: error instanceof Error ? error.message : 'SQL format failed'
    },
    null,
    2
  );

export default function SqlFormat() {
  const { t } = useTranslation('ops');
  const [dialect, setDialect] = useState<SqlDialect>('sql');
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>('upper');
  const [operation, setOperation] = useState<SqlOperation>('format');
  const [input, setInput] = useState(initialSql);
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
    Promise.resolve(
      runSqlTool({
        operation,
        dialect,
        keywordCase,
        text: input
      })
    )
      .then((result) => {
        if (!active) return;
        setOutput(result.text);
        setSummary(result.summary);
      })
      .catch((error) => {
        if (!active) return;
        setOutput('');
        setSummary(formatError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [dialect, input, keywordCase, operation]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('sqlFormat.dialect')}</InputLabel>
                <Select
                  label={t('sqlFormat.dialect')}
                  value={dialect}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (isSqlDialect(value)) setDialect(value);
                  }}
                >
                  {sqlDialectOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>{t('sqlFormat.keywordCase')}</InputLabel>
                <Select
                  label={t('sqlFormat.keywordCase')}
                  value={keywordCase}
                  onChange={(event) =>
                    setKeywordCase(event.target.value as SqlKeywordCase)
                  }
                >
                  {sqlKeywordCaseOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {t(`sqlFormat.keywordCases.${option}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={operation}
                onChange={(_, value: SqlOperation | null) => {
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
                  {t('sqlFormat.operations.format')}
                </ToggleButton>
                <ToggleButton value="minify">
                  {t('sqlFormat.operations.minify')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <ToolCodeInput
              title={t('sqlFormat.inputTitle')}
              value={input}
              onChange={setInput}
              language="sql"
            />
          </Stack>
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('sqlFormat.resultTitle')}
              value={output}
              extension="sql"
              keepSpecialCharacters
              loading={loading}
              monospace
            />
            <ToolTextResult
              title={t('sqlFormat.summaryTitle')}
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
