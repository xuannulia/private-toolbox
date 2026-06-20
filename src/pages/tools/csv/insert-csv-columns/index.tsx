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
  CsvFormatFields,
  normalizeCsvToken
} from '../CsvToolControls';
import { main } from './service';
import type {
  customPostion,
  InitialValuesType,
  insertingPosition
} from './types';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Insert CSV columns failed';

export default function InsertCsvColumns() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<InitialValuesType>({
    csvToInsert: '',
    commentCharacter: '#',
    separator: ',',
    quoteChar: '"',
    insertingPosition: 'append',
    customFill: false,
    customFillValue: '',
    customPostionOptions: 'headerName',
    headerName: '',
    rowNumber: 1
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
        main(input, {
          ...options,
          separator: normalizeCsvToken(options.separator),
          quoteChar: normalizeCsvToken(options.quoteChar),
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
              title={t('insertCsvColumns.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <CompactTextField
              label={t('insertCsvColumns.csvToInsert')}
              multiline
              rows={4}
              value={options.csvToInsert}
              onChange={(value) => updateOption('csvToInsert', value)}
            />
            <CsvFormatFields
              delimiter={options.separator}
              quote={options.quoteChar}
              comment={options.commentCharacter}
              labels={{
                delimiter: t('common.inputDelimiter'),
                quote: t('common.quote'),
                comment: t('common.comment')
              }}
              onDelimiterChange={(value) => updateOption('separator', value)}
              onQuoteChange={(value) => updateOption('quoteChar', value)}
              onCommentChange={(value) =>
                updateOption('commentCharacter', value)
              }
            />
            <Stack spacing={1.5}>
              <CompactSelect<insertingPosition>
                label={t('insertCsvColumns.insertingPositionLabel')}
                value={options.insertingPosition}
                options={[
                  {
                    label: t('insertCsvColumns.prependColumns'),
                    value: 'prepend'
                  },
                  {
                    label: t('insertCsvColumns.appendColumns'),
                    value: 'append'
                  },
                  {
                    label: t('insertCsvColumns.customPosition'),
                    value: 'custom'
                  }
                ]}
                onChange={(value) => updateOption('insertingPosition', value)}
              />
              {options.insertingPosition === 'custom' && (
                <CompactSelect<customPostion>
                  label={t('insertCsvColumns.customPositionByLabel')}
                  value={options.customPostionOptions}
                  options={[
                    {
                      label: t('insertCsvColumns.headerName'),
                      value: 'headerName'
                    },
                    {
                      label: t('insertCsvColumns.position'),
                      value: 'rowNumber'
                    }
                  ]}
                  onChange={(value) =>
                    updateOption('customPostionOptions', value)
                  }
                />
              )}
              {options.insertingPosition === 'custom' &&
                options.customPostionOptions === 'headerName' && (
                  <CompactSelect
                    label={t('insertCsvColumns.headerName')}
                    value={options.headerName}
                    options={headerOptions}
                    onChange={(value) => updateOption('headerName', value)}
                  />
                )}
              {options.insertingPosition === 'custom' &&
                options.customPostionOptions === 'rowNumber' && (
                  <CompactTextField
                    label={t('insertCsvColumns.position')}
                    type="number"
                    value={options.rowNumber}
                    onChange={(value) =>
                      updateOption('rowNumber', Number(value) || 0)
                    }
                  />
                )}
              <CompactCheckbox
                checked={options.customFill}
                label={t('common.useFillValue')}
                onChange={(value) => updateOption('customFill', value)}
              />
              {options.customFill && (
                <CompactTextField
                  label={t('common.fillValue')}
                  value={options.customFillValue}
                  onChange={(value) => updateOption('customFillValue', value)}
                />
              )}
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            extension="csv"
            keepSpecialCharacters
            monospace
            title={t('insertCsvColumns.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
