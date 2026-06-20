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
import { unwrapList } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unwrap list failed';

export default function Unwrap() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState('\\n');
  const [joinSeparator, setJoinSeparator] = useState('\\n');
  const [deleteEmptyItems, setDeleteEmptyItems] = useState(true);
  const [multiLevel, setMultiLevel] = useState(true);
  const [trimItems, setTrimItems] = useState(true);
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
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
        unwrapList(
          splitMode,
          input,
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          deleteEmptyItems,
          multiLevel,
          trimItems,
          normalizeListSeparator(left),
          normalizeListSeparator(right)
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    deleteEmptyItems,
    input,
    joinSeparator,
    left,
    multiLevel,
    right,
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
              title={t('unwrap.inputTitle')}
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
                label={t('unwrap.leftTextLabel')}
                value={left}
                onChange={setLeft}
              />
              <CompactTextField
                label={t('unwrap.rightTextLabel')}
                value={right}
                onChange={setRight}
              />
              <CompactCheckbox
                checked={multiLevel}
                label={t('unwrap.multiLevel')}
                onChange={setMultiLevel}
              />
              <CompactCheckbox
                checked={trimItems}
                label={t('unwrap.trimItems')}
                onChange={setTrimItems}
              />
              <CompactCheckbox
                checked={deleteEmptyItems}
                label={t('unwrap.removeEmptyItems')}
                onChange={setDeleteEmptyItems}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('unwrap.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
