import { Box, Stack } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolMultipleImageInput, {
  MultiImageInput
} from '@components/input/ToolMultipleImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolMultiFileResult from '@components/result/ToolMultiFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import {
  CompactImageField,
  ImageOptionStack,
  ImageStatList
} from '../../ImageToolControls';
import { compressImages } from './service';
import { type InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  maxFileSizeInMB: 1.0,
  quality: 80
};

export default function CompressImage() {
  const { t } = useTranslation('image');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [input, setInput] = useState<MultiImageInput[]>([]);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [results, setResults] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  useEffect(() => {
    if (!input.length) {
      setResults([]);
      setZipFile(null);
      setOriginalSize(null);
      setCompressedSize(null);
      setIsProcessing(false);
      return;
    }

    const files = input.map((image) => image.file);
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runCompression() {
        setOriginalSize(files.reduce((acc, image) => acc + image.size, 0));
        setResults([]);
        setZipFile(null);

        try {
          setIsProcessing(true);
          const output = await compressImages(files, options);

          if (!output) {
            if (!canceled) {
              showSnackBar(t('compress.failedToCompress'), 'error');
            }
            return;
          }

          if (!canceled) {
            if (output.results.length < input.length) {
              showSnackBar(t('compress.someFailedToCompress'), 'error');
            }

            setResults(output.results);
            setZipFile(output.zipFile);
            setCompressedSize(
              output.results.reduce((acc, image) => acc + image.size, 0)
            );
          }
        } catch (error) {
          console.error('Error in compression:', error);
          if (!canceled) showSnackBar(t('compress.failedToCompress'), 'error');
        } finally {
          if (!canceled) setIsProcessing(false);
        }
      }

      void runCompression();
    }, 500);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options, showSnackBar, t]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolMultipleImageInput
              value={input}
              type="image"
              onChange={setInput}
              accept={['image/*']}
              title={t('compress.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageField
                label={t('compress.maxFileSize')}
                value={options.maxFileSizeInMB}
                onChange={(maxFileSizeInMB) =>
                  setOptions((current) => ({
                    ...current,
                    maxFileSizeInMB: Math.max(
                      0.1,
                      Number(maxFileSizeInMB) || 0.1
                    )
                  }))
                }
              />
              <CompactImageField
                label={t('compress.quality')}
                value={options.quality}
                onChange={(quality) =>
                  setOptions((current) => ({
                    ...current,
                    quality: Math.min(100, Math.max(10, Number(quality) || 10))
                  }))
                }
              />
              <ImageStatList
                rows={[
                  {
                    label: t('compress.originalSize'),
                    value:
                      originalSize === null
                        ? null
                        : `${(originalSize / 1024).toFixed(2)} KB`
                  },
                  {
                    label: t('compress.compressedSize'),
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
          zipFile ? (
            <ToolMultiFileResult
              title={t('compress.resultTitle')}
              value={results}
              zipFile={zipFile}
              loading={isProcessing}
            />
          ) : (
            <ToolFileResult
              title={t('compress.resultTitle')}
              value={results[0] ?? null}
              extension={results[0]?.name.split('.').pop() || 'png'}
              loading={isProcessing}
              loadingText={t('compress.compressing')}
            />
          )
        }
      />
    </Box>
  );
}
