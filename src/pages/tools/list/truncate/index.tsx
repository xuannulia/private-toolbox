import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactSelect,
  CompactTextField,
  ListSplitMode,
  SplitOptions,
  normalizeListSeparator
} from '../ListToolControls';
import { truncateList } from './service';

type TruncateFrom = 'start' | 'end';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Truncate list failed';

export default function Truncate() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [joinSeparator, setJoinSeparator] = useState(',');
  const [from, setFrom] = useState<TruncateFrom>('start');
  const [length, setLength] = useState('3');
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
        truncateList(
          splitMode,
          input,
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          from === 'start',
          Number(length)
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [from, input, joinSeparator, length, splitMode, splitSeparator]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('truncate.inputTitle')}
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
                label={t('truncate.lengthLabel')}
                type="number"
                value={length}
                onChange={setLength}
              />
              <CompactSelect
                label={t('truncate.keepFromLabel')}
                value={from}
                options={[
                  { label: t('truncate.keepStart'), value: 'start' },
                  { label: t('truncate.keepEnd'), value: 'end' }
                ]}
                onChange={setFrom}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('truncate.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
