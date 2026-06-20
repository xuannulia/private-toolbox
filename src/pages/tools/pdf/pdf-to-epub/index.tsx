import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolPdfInput from '@components/input/ToolPdfInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { convertPdfToEpub } from './service';

export default function PdfToEpub() {
  const { t } = useTranslation('pdf');
  const [input, setInput] = useState<File | null>(null);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runConversion() {
        try {
          setLoading(true);
          const epub = await convertPdfToEpub(inputFile);

          if (!canceled) setResult(epub);
        } catch (error) {
          console.error('Failed to convert PDF to EPUB:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runConversion();
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
            title={t('pdfToEpub.inputTitle')}
          />
        }
        result={
          <ToolFileResult
            title={t('pdfToEpub.resultTitle')}
            value={result}
            extension="epub"
            loading={loading}
            loadingText={t('pdfToEpub.convertingPdf')}
          />
        }
      />
    </Box>
  );
}
