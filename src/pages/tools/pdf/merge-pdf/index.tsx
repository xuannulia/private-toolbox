import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolMultiPdfInput, {
  type MultiPdfInput
} from '@components/input/ToolMultiplePdfInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mergePdf } from './service';

export default function MergePdf() {
  const { t } = useTranslation('pdf');
  const [input, setInput] = useState<MultiPdfInput[]>([]);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input.length) {
      setResult(null);
      setLoading(false);
      return;
    }

    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runMerge() {
        try {
          setLoading(true);
          const files = [...input]
            .sort((a, b) => a.order - b.order)
            .map((item) => item.file);
          const mergeResult = await mergePdf(files);

          if (!canceled) setResult(mergeResult);
        } catch (error) {
          console.error('Error merging PDF:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runMerge();
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
          <ToolMultiPdfInput
            value={input}
            onChange={setInput}
            accept={['application/pdf']}
            title={t('mergePdf.inputTitle')}
            type="pdf"
          />
        }
        result={
          <ToolFileResult
            title={t('mergePdf.resultTitle')}
            value={result}
            extension="pdf"
            loading={loading}
            loadingText={t('mergePdf.mergingPdfs')}
          />
        }
      />
    </Box>
  );
}
