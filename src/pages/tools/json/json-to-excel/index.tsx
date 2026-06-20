import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField
} from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createJsonExcelFile, type JsonToExcelWebResult } from './service';

const initialJson = JSON.stringify(
  [
    {
      id: 1,
      name: 'Ada',
      active: true,
      address: {
        city: 'Paris',
        zip: '75000'
      }
    },
    {
      id: 2,
      name: 'Grace',
      active: false,
      address: {
        city: 'London'
      }
    }
  ],
  null,
  2
);

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Excel generation failed';

export default function JsonToExcel({ title }: ToolComponentProps) {
  const { t } = useTranslation('json');
  const [text, setText] = useState(initialJson);
  const [sheetName, setSheetName] = useState('Sheet1');
  const [fileName, setFileName] = useState('private-toolbox.xlsx');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [result, setResult] = useState<JsonToExcelWebResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!text.trim()) {
      setResult(null);
      setError('');
      return;
    }

    setLoading(true);
    createJsonExcelFile({
      text,
      sheetName,
      fileName,
      includeHeaders
    })
      .then((value) => {
        if (!active) return;
        setResult(value);
        setError('');
      })
      .catch((caught) => {
        if (!active) return;
        setResult(null);
        setError(formatError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fileName, includeHeaders, sheetName, text]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label={t('jsonToExcel.sheetName')}
                value={sheetName}
                onChange={(event) => setSheetName(event.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label={t('jsonToExcel.fileName')}
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                fullWidth
                size="small"
              />
            </Stack>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeHeaders}
                  onChange={(event) => setIncludeHeaders(event.target.checked)}
                />
              }
              label={t('jsonToExcel.includeHeaders')}
            />
            <ToolCodeInput
              title={t('jsonToExcel.inputTitle')}
              value={text}
              onChange={setText}
              language="json"
            />
          </Stack>
        }
        result={
          error ? (
            <ToolTextResult
              title={t('jsonToExcel.errorTitle')}
              value={error}
              extension="txt"
            />
          ) : (
            <ToolFileResult
              title={t('jsonToExcel.resultTitle', {
                rows: result?.rowCount ?? 0,
                columns: result?.columnCount ?? 0
              })}
              value={result?.file ?? null}
              extension="xlsx"
              loading={loading}
            />
          )
        }
      />
    </Box>
  );
}
