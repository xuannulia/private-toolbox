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
import { DisplayFormat, SortingMethod, TopItemsList } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Find popular items failed';

export default function FindMostPopular() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [displayFormat, setDisplayFormat] = useState<DisplayFormat>('count');
  const [sortingMethod, setSortingMethod] =
    useState<SortingMethod>('alphabetic');
  const [deleteEmptyItems, setDeleteEmptyItems] = useState(false);
  const [ignoreItemCase, setIgnoreItemCase] = useState(false);
  const [trimItems, setTrimItems] = useState(false);
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
        TopItemsList(
          splitMode,
          sortingMethod,
          displayFormat,
          normalizeListSeparator(splitSeparator),
          input,
          deleteEmptyItems,
          ignoreItemCase,
          trimItems
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    deleteEmptyItems,
    displayFormat,
    ignoreItemCase,
    input,
    sortingMethod,
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
              title={t('findMostPopular.inputTitle')}
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
              <CompactSelect
                label={t('common.outputFormat')}
                value={displayFormat}
                options={[
                  {
                    label: t('findMostPopular.displayOptions.count'),
                    value: 'count'
                  },
                  {
                    label: t('findMostPopular.displayOptions.percentage'),
                    value: 'percentage'
                  },
                  {
                    label: t('findMostPopular.displayOptions.total'),
                    value: 'total'
                  }
                ]}
                onChange={setDisplayFormat}
              />
              <CompactSelect
                label={t('common.order')}
                value={sortingMethod}
                options={[
                  {
                    label: t('findMostPopular.sortOptions.alphabetic'),
                    value: 'alphabetic'
                  },
                  {
                    label: t('findMostPopular.sortOptions.count'),
                    value: 'count'
                  }
                ]}
                onChange={setSortingMethod}
              />
              <CompactCheckbox
                checked={deleteEmptyItems}
                label={t('findMostPopular.removeEmptyItems')}
                onChange={setDeleteEmptyItems}
              />
              <CompactCheckbox
                checked={trimItems}
                label={t('findMostPopular.trimItems')}
                onChange={setTrimItems}
              />
              <CompactCheckbox
                checked={ignoreItemCase}
                label={t('findMostPopular.ignoreItemCase')}
                onChange={setIgnoreItemCase}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('findMostPopular.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
