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
import { chunkList } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Chunk list failed';

export default function ChunkList() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [groupNumber, setGroupNumber] = useState('2');
  const [itemSeparator, setItemSeparator] = useState(',');
  const [leftWrap, setLeftWrap] = useState('[');
  const [rightWrap, setRightWrap] = useState(']');
  const [groupSeparator, setGroupSeparator] = useState('\\n');
  const [deleteEmptyItems, setDeleteEmptyItems] = useState(true);
  const [padNonFullGroup, setPadNonFullGroup] = useState(false);
  const [paddingChar, setPaddingChar] = useState('...');
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
        chunkList(
          splitMode,
          normalizeListSeparator(splitSeparator),
          input,
          Number(groupNumber),
          normalizeListSeparator(itemSeparator),
          normalizeListSeparator(leftWrap),
          normalizeListSeparator(rightWrap),
          normalizeListSeparator(groupSeparator),
          deleteEmptyItems,
          padNonFullGroup,
          normalizeListSeparator(paddingChar)
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    deleteEmptyItems,
    groupNumber,
    groupSeparator,
    input,
    itemSeparator,
    leftWrap,
    padNonFullGroup,
    paddingChar,
    rightWrap,
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
              title={t('chunk.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <SplitOptions
              splitMode={splitMode}
              splitSeparator={splitSeparator}
              labels={{
                symbol: t('common.symbolMode'),
                regex: t('common.regexMode'),
                splitSeparator: t('common.splitSeparator'),
                joinSeparator: t('common.joinSeparator')
              }}
              onSplitModeChange={setSplitMode}
              onSplitSeparatorChange={setSplitSeparator}
            />
            <Stack spacing={1.5}>
              <CompactTextField
                label={t('chunk.groupNumberLabel')}
                type="number"
                value={groupNumber}
                onChange={setGroupNumber}
              />
              <CompactTextField
                label={t('chunk.itemSeparatorLabel')}
                value={itemSeparator}
                onChange={setItemSeparator}
              />
              <CompactTextField
                label={t('chunk.groupSeparatorLabel')}
                value={groupSeparator}
                onChange={setGroupSeparator}
              />
              <CompactTextField
                label={t('chunk.leftWrapLabel')}
                value={leftWrap}
                onChange={setLeftWrap}
              />
              <CompactTextField
                label={t('chunk.rightWrapLabel')}
                value={rightWrap}
                onChange={setRightWrap}
              />
              <CompactCheckbox
                checked={deleteEmptyItems}
                label={t('chunk.deleteEmptyItems')}
                onChange={setDeleteEmptyItems}
              />
              <CompactCheckbox
                checked={padNonFullGroup}
                label={t('chunk.padNonFullGroups')}
                onChange={setPadNonFullGroup}
              />
              <CompactTextField
                label={t('chunk.paddingCharLabel')}
                value={paddingChar}
                onChange={setPaddingChar}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('chunk.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
