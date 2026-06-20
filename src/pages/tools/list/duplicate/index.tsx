import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CompactTextField,
  ListSplitMode,
  SplitOptions,
  normalizeListSeparator
} from '../ListToolControls';
import { duplicateList } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Duplicate list failed';

export default function Duplicate() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(' ');
  const [joinSeparator, setJoinSeparator] = useState(' ');
  const [copy, setCopy] = useState('2');
  const [concatenate, setConcatenate] = useState(true);
  const [reverse, setReverse] = useState(false);
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
        duplicateList(
          splitMode,
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          input,
          concatenate,
          reverse,
          Number(copy)
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    concatenate,
    copy,
    input,
    joinSeparator,
    reverse,
    splitMode,
    splitSeparator
  ]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('duplicate.inputTitle')}
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
                label={t('duplicate.copyLabel')}
                type="number"
                value={copy}
                onChange={setCopy}
              />
              <CompactCheckbox
                checked={concatenate}
                label={t('duplicate.concatenate')}
                onChange={setConcatenate}
              />
              <CompactCheckbox
                checked={reverse}
                label={t('duplicate.reverse')}
                onChange={setReverse}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('duplicate.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
