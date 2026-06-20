import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolPdfInput from '@components/input/ToolPdfInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolMultiFileResult from '@components/result/ToolMultiFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { processPDF } from './service';

export default function ExtractImagesFromPdf() {
  const { t } = useTranslation('pdf');
  const [input, setInput] = useState<File | null>(null);
  const [result, setResult] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) {
      setResult([]);
      setZipFile(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runExtraction() {
        try {
          setLoading(true);
          const output = await processPDF(inputFile);

          if (!canceled) {
            setResult(output?.extractedImages ?? []);
            setZipFile(output?.zipFile ?? null);
          }
        } catch (error) {
          console.error('Failed to extract images from PDF:', error);
          if (!canceled) {
            setResult([]);
            setZipFile(null);
          }
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runExtraction();
    }, 300);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolPdfInput
            value={input}
            onChange={setInput}
            accept={['application/pdf']}
            title={t('extractImagesFromPdf.inputTitle')}
          />
        }
        result={
          zipFile ? (
            <ToolMultiFileResult
              title={t('extractImagesFromPdf.resultTitle')}
              value={result}
              zipFile={zipFile}
              loading={loading}
            />
          ) : (
            <ToolFileResult
              title={t('extractImagesFromPdf.resultTitle')}
              value={result[0] ?? null}
              extension="png"
              loading={loading}
            />
          )
        }
      />
    </Box>
  );
}
