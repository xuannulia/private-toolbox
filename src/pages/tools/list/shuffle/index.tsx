import { Box, Button, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactTextField,
  ListSplitMode,
  SplitOptions,
  normalizeListSeparator
} from '../ListToolControls';
import { shuffleList } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Shuffle list failed';

export default function Shuffle() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [joinSeparator, setJoinSeparator] = useState(',');
  const [length, setLength] = useState('');
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(
        shuffleList(
          splitMode,
          input,
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          length ? Number(length) : undefined
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [generation, input, joinSeparator, length, splitMode, splitSeparator]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('shuffle.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <SplitOptions
              splitMode={splitMode}
              splitSeparator={splitSeparator}
              joinSeparator={joinSeparator}
              labels={{
                symbol: t('common.symbolMode'),
                regex: t('common.regexMode'),
                splitSeparator: t('common.splitSeparator'),
                joinSeparator: t('common.joinSeparator')
              }}
              onSplitModeChange={setSplitMode}
              onSplitSeparatorChange={setSplitSeparator}
              onJoinSeparatorChange={setJoinSeparator}
            />
            <Stack spacing={1.5}>
              <CompactTextField
                label={t('shuffle.lengthLabel')}
                type="number"
                value={length}
                onChange={setLength}
              />
              <Button
                startIcon={<RefreshIcon />}
                variant="contained"
                onClick={() => setGeneration((value) => value + 1)}
              >
                {t('shuffle.shuffleAgain')}
              </Button>
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('shuffle.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
