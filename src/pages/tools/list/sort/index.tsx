import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CompactSelect,
  ListSplitMode,
  SplitOptions,
  normalizeListSeparator
} from '../ListToolControls';
import { Sort, SortingMethod } from './service';

type SortOrder = 'increasing' | 'decreasing';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Sort list failed';

export default function SortList() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [joinSeparator, setJoinSeparator] = useState(',');
  const [sortingMethod, setSortingMethod] =
    useState<SortingMethod>('alphabetic');
  const [order, setOrder] = useState<SortOrder>('increasing');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [removeDuplicated, setRemoveDuplicated] = useState(false);
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
        Sort(
          sortingMethod,
          splitMode,
          input,
          order === 'increasing',
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          removeDuplicated,
          caseSensitive
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    caseSensitive,
    input,
    joinSeparator,
    order,
    removeDuplicated,
    sortingMethod,
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
              title={t('sort.inputTitle')}
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
              <CompactSelect
                label={t('sort.sortMethod')}
                value={sortingMethod}
                options={[
                  {
                    label: t('sort.sortOptions.alphabetic'),
                    value: 'alphabetic'
                  },
                  { label: t('sort.sortOptions.numeric'), value: 'numeric' },
                  { label: t('sort.sortOptions.length'), value: 'length' }
                ]}
                onChange={setSortingMethod}
              />
              <CompactSelect
                label={t('common.order')}
                value={order}
                options={[
                  {
                    label: t('sort.orderOptions.increasing'),
                    value: 'increasing'
                  },
                  {
                    label: t('sort.orderOptions.decreasing'),
                    value: 'decreasing'
                  }
                ]}
                onChange={setOrder}
              />
              <CompactCheckbox
                checked={caseSensitive}
                label={t('sort.caseSensitive')}
                onChange={setCaseSensitive}
              />
              <CompactCheckbox
                checked={removeDuplicated}
                label={t('sort.removeDuplicates')}
                onChange={setRemoveDuplicated}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('sort.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
