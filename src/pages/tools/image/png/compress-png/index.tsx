import { Box, Stack } from '@mui/material';
import imageCompression from 'browser-image-compression';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import {
  CompactImageField,
  ImageOptionStack,
  ImageStatList
} from '../../ImageToolControls';

const initialOptions = {
  rate: '50'
};

export default function CompressPng() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setOriginalSize(null);
      setCompressedSize(null);
      setLoading(false);
      return;
    }

    const image = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runCompression() {
        const rate = Math.min(100, Math.max(1, Number(options.rate) || 1));

        try {
          setLoading(true);
          setOriginalSize(image.size);
          const compressedFile = await imageCompression(image, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1024,
            initialQuality: rate / 100,
            useWebWorker: true
          });

          if (!canceled) {
            setResult(compressedFile);
            setCompressedSize(compressedFile.size);
          }
        } catch (error) {
          console.error('Error during compression:', error);
          if (!canceled) {
            setResult(null);
            setCompressedSize(null);
          }
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runCompression();
    }, 500);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolImageInput
              value={input}
              onChange={setInput}
              accept={['image/png']}
              title={t('compressPng.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageField
                label={t('compressPng.rate')}
                value={options.rate}
                onChange={(rate) => setOptions({ rate })}
              />
              <ImageStatList
                rows={[
                  {
                    label: t('compressPng.originalSize'),
                    value:
                      originalSize === null
                        ? null
                        : `${(originalSize / 1024).toFixed(2)} KB`
                  },
                  {
                    label: t('compressPng.compressedSize'),
                    value:
                      compressedSize === null
                        ? null
                        : `${(compressedSize / 1024).toFixed(2)} KB`
                  }
                ]}
              />
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('compressPng.resultTitle')}
            value={result}
            extension="png"
            loading={loading}
            loadingText={t('compressPng.loadingText')}
          />
        }
      />
    </Box>
  );
}
