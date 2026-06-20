import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolPdfInput from '@components/input/ToolPdfInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { CustomSnackBarContext } from 'contexts/CustomSnackBarContext';
import { PDFDocument } from 'pdf-lib';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactPdfToggle,
  PdfOptionStack,
  PdfStatList
} from '../PdfToolControls';
import { compressPdf } from './service';
import type { CompressionLevel, InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  compressionLevel: 'low'
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function CompressPdf() {
  const { t } = useTranslation('pdf');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [resultSize, setResultSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    size: string;
    pages: number;
  } | null>(null);

  useEffect(() => {
    if (!input) {
      setFileInfo(null);
      setResultSize('');
      return;
    }

    let canceled = false;

    async function readPdfInfo() {
      try {
        const arrayBuffer = await input!.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);

        if (!canceled) {
          setFileInfo({
            pages: pdf.getPageCount(),
            size: formatFileSize(input!.size)
          });
        }
      } catch (error) {
        console.error('Error getting PDF info:', error);
        if (!canceled) {
          setFileInfo(null);
          showSnackBar(t('compressPdf.errorReadingPdf'), 'error');
        }
      }
    }

    void readPdfInfo();

    return () => {
      canceled = true;
    };
  }, [input, showSnackBar, t]);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setResultSize('');
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runCompression() {
        try {
          setLoading(true);
          const compressedPdf = await compressPdf(inputFile, options);

          if (!canceled) {
            setResult(compressedPdf);
            setResultSize(formatFileSize(compressedPdf.size));
          }
        } catch (error) {
          console.error('Error compressing PDF:', error);
          if (!canceled) {
            showSnackBar(
              t('compressPdf.errorCompressingPdf', {
                error: error instanceof Error ? error.message : String(error)
              }),
              'error'
            );
            setResult(null);
            setResultSize('');
          }
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runCompression();
    }, 300);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options, showSnackBar, t]);

  const compressionOptions: {
    value: CompressionLevel;
    label: string;
  }[] = [
    { value: 'low', label: t('compressPdf.lowCompression') },
    { value: 'medium', label: t('compressPdf.mediumCompression') },
    { value: 'high', label: t('compressPdf.highCompression') }
  ];

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolPdfInput
              value={input}
              onChange={setInput}
              accept={['application/pdf']}
              title={t('compressPdf.inputTitle')}
            />
            <PdfOptionStack>
              <CompactPdfToggle
                label={t('compressPdf.compressionLevel')}
                value={options.compressionLevel}
                options={compressionOptions}
                onChange={(compressionLevel) =>
                  setOptions({ compressionLevel })
                }
              />
              <PdfStatList
                items={[
                  { label: t('compressPdf.fileSize'), value: fileInfo?.size },
                  { label: t('compressPdf.pages'), value: fileInfo?.pages },
                  {
                    label: t('compressPdf.compressedFileSize'),
                    value: resultSize
                  }
                ]}
              />
            </PdfOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('compressPdf.resultTitle')}
            value={result}
            extension="pdf"
            loading={loading}
            loadingText={t('compressPdf.compressingPdf')}
          />
        }
      />
    </Box>
  );
}
