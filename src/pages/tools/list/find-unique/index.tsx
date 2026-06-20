import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  ListSplitMode,
  SplitOptions,
  normalizeListSeparator
} from '../ListToolControls';
import { findUniqueCompute } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Find unique items failed';

export default function FindUnique() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [joinSeparator, setJoinSeparator] = useState('\\n');
  const [deleteEmptyItems, setDeleteEmptyItems] = useState(true);
  const [trimItems, setTrimItems] = useState(true);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [absolutelyUnique, setAbsolutelyUnique] = useState(false);
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
        findUniqueCompute(
          splitMode,
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          input,
          deleteEmptyItems,
          trimItems,
          caseSensitive,
          absolutelyUnique
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    absolutelyUnique,
    caseSensitive,
    deleteEmptyItems,
    input,
    joinSeparator,
    splitMode,
    splitSeparator,
    trimItems
  ]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('findUnique.inputTitle')}
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
            <Stack spacing={0.5}>
              <CompactCheckbox
                checked={trimItems}
                label={t('findUnique.trimItems')}
                onChange={setTrimItems}
              />
              <CompactCheckbox
                checked={deleteEmptyItems}
                label={t('findUnique.skipEmptyItems')}
                onChange={setDeleteEmptyItems}
              />
              <CompactCheckbox
                checked={caseSensitive}
                label={t('findUnique.caseSensitiveItems')}
                onChange={setCaseSensitive}
              />
              <CompactCheckbox
                checked={absolutelyUnique}
                label={t('findUnique.findAbsolutelyUniqueItems')}
                onChange={setAbsolutelyUnique}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('findUnique.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
