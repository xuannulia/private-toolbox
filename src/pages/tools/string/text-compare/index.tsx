import {
  Box,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolDiffResult from '@components/result/ToolDiffResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { compareTextsHtml } from './service';
import { level } from './types';

export default function TextCompare() {
  const { t } = useTranslation('string');
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [level, setLevel] = useState<level>('word');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(inputA || inputB ? compareTextsHtml(inputA, inputB, level) : '');
  }, [inputA, inputB, level]);

  return (
    <Box>
      <Stack spacing={2}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={level}
          onChange={(_, nextLevel: level | null) => {
            if (nextLevel) {
              setLevel(nextLevel);
            }
          }}
        >
          <ToggleButton value="word">
            {t('textCompare.options.wordLevel')}
          </ToggleButton>
          <ToggleButton value="char">
            {t('textCompare.options.charLevel')}
          </ToggleButton>
        </ToggleButtonGroup>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <ToolTextInput
              title={t('textCompare.leftTitle')}
              value={inputA}
              onChange={setInputA}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ToolTextInput
              title={t('textCompare.rightTitle')}
              value={inputB}
              onChange={setInputB}
            />
          </Grid>
        </Grid>
        <ToolDiffResult
          disabled={!result}
          isHtml
          title={t('textCompare.resultTitle')}
          value={result}
        />
      </Stack>
    </Box>
  );
}
