import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ListSplitMode,
  SplitOptions,
  normalizeListSeparator
} from '../ListToolControls';
import { reverseList } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Reverse list failed';

export default function Reverse() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [joinSeparator, setJoinSeparator] = useState('\\n');
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
        reverseList(
          splitMode,
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          input
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, joinSeparator, splitMode, splitSeparator]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('reverse.inputTitle')}
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
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('reverse.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
