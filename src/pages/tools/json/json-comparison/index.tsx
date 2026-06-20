import { Box, Grid } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { compareJson } from './service';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Invalid JSON input';

export default function JsonComparison() {
  const { t } = useTranslation('json');
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!left.trim() && !right.trim()) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(compareJson(left || '{}', right || '{}', 'text'));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [left, right]);

  const output = error
    ? t('comparison.invalidInput', { error })
    : result === 'No differences found'
      ? t('comparison.noDifferences')
      : result;

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <ToolCodeInput
            title={t('comparison.leftTitle')}
            value={left}
            onChange={setLeft}
            language="json"
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ToolCodeInput
            title={t('comparison.rightTitle')}
            value={right}
            onChange={setRight}
            language="json"
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <ToolTextResult
            disabled={!output || Boolean(error)}
            extension="txt"
            keepSpecialCharacters
            monospace
            title={t('comparison.resultTitle')}
            value={output}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
