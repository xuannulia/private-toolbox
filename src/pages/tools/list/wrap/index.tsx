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
import { wrapList } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Wrap list failed';

export default function Wrap() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [joinSeparator, setJoinSeparator] = useState(',');
  const [deleteEmptyItems, setDeleteEmptyItems] = useState(true);
  const [left, setLeft] = useState('"');
  const [right, setRight] = useState('"');
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
        wrapList(
          splitMode,
          input,
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          deleteEmptyItems,
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
    right,
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
              title={t('wrap.inputTitle')}
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
                label={t('wrap.leftTextLabel')}
                value={left}
                onChange={setLeft}
              />
              <CompactTextField
                label={t('wrap.rightTextLabel')}
                value={right}
                onChange={setRight}
              />
              <CompactCheckbox
                checked={deleteEmptyItems}
                label={t('wrap.removeEmptyItems')}
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
            title={t('wrap.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
