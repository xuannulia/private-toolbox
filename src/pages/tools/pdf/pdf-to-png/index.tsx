import { Box } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolPdfInput from '@components/input/ToolPdfInput';
import ToolMultiFileResult from '@components/result/ToolMultiFileResult';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { convertPdfToPngImages } from './service';

type ImagePreview = {
  blob: Blob;
  url: string;
  filename: string;
};

export default function PdfToPng() {
  const { t } = useTranslation('pdf');
  const [input, setInput] = useState<File | null>(null);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const imageFiles = useMemo(
    () =>
      images.map(
        (image) => new File([image.blob], image.filename, { type: 'image/png' })
      ),
    [images]
  );

  useEffect(() => {
    if (!input) {
      setImages([]);
      setZipFile(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runConversion() {
        try {
          setLoading(true);
          const output = await convertPdfToPngImages(inputFile);

          if (!canceled) {
            setImages(output.images);
            setZipFile(output.zipFile);
          }
        } catch (error) {
          console.error('PDF to PNG conversion failed:', error);
          if (!canceled) {
            setImages([]);
            setZipFile(null);
          }
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
            title={t('pdfToPng.inputTitle')}
          />
        }
        result={
          <ToolMultiFileResult
            title={t('pdfToPng.resultTitle')}
            value={imageFiles}
            zipFile={zipFile}
            loading={loading}
            loadingText={t('pdfToPng.loadingText')}
          />
        }
      />
    </Box>
  );
}
