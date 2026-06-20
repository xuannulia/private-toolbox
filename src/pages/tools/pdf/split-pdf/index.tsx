import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolPdfInput from '@components/input/ToolPdfInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { PDFDocument } from 'pdf-lib';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactPdfField,
  PdfOptionStack,
  PdfStatList
} from '../PdfToolControls';
import { parsePageRanges, splitPdf } from './service';

type InitialValuesType = {
  pageRanges: string;
};

const initialOptions: InitialValuesType = {
  pageRanges: ''
};

export default function SplitPdf() {
  const { t } = useTranslation('pdf');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (!input) {
      setTotalPages(0);
      return;
    }

    let canceled = false;

    async function readPdfInfo() {
      try {
        const arrayBuffer = await input!.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);

        if (!canceled) setTotalPages(pdf.getPageCount());
      } catch (error) {
        console.error('Error getting PDF info:', error);
        if (!canceled) setTotalPages(0);
      }
    }

    void readPdfInfo();

    return () => {
      canceled = true;
    };
  }, [input]);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runSplit() {
        try {
          setLoading(true);
          const splitResult = await splitPdf(inputFile, options.pageRanges);

          if (!canceled) setResult(splitResult);
        } catch (error) {
          console.error('Error splitting PDF:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runSplit();
    }, 300);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options.pageRanges]);

  const pageRangePreview = useMemo(() => {
    if (!totalPages || !options.pageRanges.trim()) return '';

    const count = parsePageRanges(options.pageRanges, totalPages).length;
    if (!count) return '';

    return t('splitPdf.pageExtractionPreview', {
      count,
      plural: count === 1 ? '' : 's'
    });
  }, [options.pageRanges, totalPages, t]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolPdfInput
              value={input}
              onChange={setInput}
              accept={['application/pdf']}
              title={t('splitPdf.inputTitle')}
            />
            <PdfOptionStack>
              <CompactPdfField
                label={t('splitPdf.pageRanges')}
                value={options.pageRanges}
                placeholder={t('splitPdf.pageRangesPlaceholder')}
                onChange={(pageRanges) => setOptions({ pageRanges })}
              />
              <PdfStatList
                items={[
                  {
                    label: t('splitPdf.pdfPageCountLabel'),
                    value: totalPages || undefined
                  },
                  {
                    label: t('splitPdf.previewLabel'),
                    value: pageRangePreview
                  }
                ]}
              />
            </PdfOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('splitPdf.resultTitle')}
            value={result}
            extension="pdf"
            loading={loading}
            loadingText={t('splitPdf.extractingPages')}
          />
        }
      />
    </Box>
  );
}
