import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { getCsvHeaders } from '@utils/csv';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CompactSelect,
  CompactTextField,
  CompactToggle,
  normalizeCsvToken
} from '../CsvToolControls';
import { csvColumnsSwap } from './service';
import type { InitialValuesType } from './types';

type ColumnMode = 'position' | 'header';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Swap CSV columns failed';

export default function SwapCsvColumns() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<InitialValuesType>({
    fromPositionStatus: true,
    toPositionStatus: true,
    fromPosition: '1',
    toPosition: '2',
    fromHeader: '',
    toHeader: '',
    emptyValuesFilling: true,
    customFiller: '',
    deleteComment: true,
    commentCharacter: '#',
    emptyLines: true
  });
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const headerOptions = useMemo(
    () => [
      { label: t('common.none'), value: '' },
      ...getCsvHeaders(input).map((header) => ({
        label: header,
        value: header
      }))
    ],
    [input, t]
  );

  const updateOption = <K extends keyof InitialValuesType>(
    key: K,
    value: InitialValuesType[K]
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    try {
      setResult(
        csvColumnsSwap(input, {
          ...options,
          commentCharacter: normalizeCsvToken(options.commentCharacter)
        })
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [input, options]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('common.inputCsv')}
              value={input}
              onChange={setInput}
            />
            <Stack spacing={1.5}>
              <CompactToggle<ColumnMode>
                value={options.fromPositionStatus ? 'position' : 'header'}
                options={[
                  { label: t('swapCsvColumns.byPosition'), value: 'position' },
                  { label: t('swapCsvColumns.byHeader'), value: 'header' }
                ]}
                onChange={(value) =>
                  updateOption('fromPositionStatus', value === 'position')
                }
              />
              {options.fromPositionStatus ? (
                <CompactTextField
                  label={t('swapCsvColumns.fromColumn')}
                  type="number"
                  value={options.fromPosition}
                  onChange={(value) => updateOption('fromPosition', value)}
                />
              ) : (
                <CompactSelect
                  label={t('swapCsvColumns.fromColumn')}
                  value={options.fromHeader}
                  options={headerOptions}
                  onChange={(value) => updateOption('fromHeader', value)}
                />
              )}
              <CompactToggle<ColumnMode>
                value={options.toPositionStatus ? 'position' : 'header'}
                options={[
                  { label: t('swapCsvColumns.byPosition'), value: 'position' },
                  { label: t('swapCsvColumns.byHeader'), value: 'header' }
                ]}
                onChange={(value) =>
                  updateOption('toPositionStatus', value === 'position')
                }
              />
              {options.toPositionStatus ? (
                <CompactTextField
                  label={t('swapCsvColumns.toColumn')}
                  type="number"
                  value={options.toPosition}
                  onChange={(value) => updateOption('toPosition', value)}
                />
              ) : (
                <CompactSelect
                  label={t('swapCsvColumns.toColumn')}
                  value={options.toHeader}
                  options={headerOptions}
                  onChange={(value) => updateOption('toHeader', value)}
                />
              )}
              <CompactCheckbox
                checked={options.emptyValuesFilling}
                label={t('common.fillMissingWithEmpty')}
                onChange={(value) => updateOption('emptyValuesFilling', value)}
              />
              {!options.emptyValuesFilling && (
                <CompactTextField
                  label={t('common.fillValue')}
                  value={options.customFiller}
                  onChange={(value) => updateOption('customFiller', value)}
                />
              )}
              <CompactCheckbox
                checked={options.deleteComment}
                label={t('common.skipComments')}
                onChange={(value) => updateOption('deleteComment', value)}
              />
              {options.deleteComment && (
                <CompactTextField
                  label={t('common.comment')}
                  value={options.commentCharacter}
                  onChange={(value) => updateOption('commentCharacter', value)}
                />
              )}
              <CompactCheckbox
                checked={options.emptyLines}
                label={t('common.skipEmptyLines')}
                onChange={(value) => updateOption('emptyLines', value)}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="csv"
            keepSpecialCharacters
            monospace
            title={t('common.outputCsv')}
            value={output}
          />
        }
      />
    </Box>
  );
}
