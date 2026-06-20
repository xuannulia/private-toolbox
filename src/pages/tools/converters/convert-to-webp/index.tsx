import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolMultipleImageInput from '@components/input/ToolMultipleImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolMultiFileResult from '@components/result/ToolMultiFileResult';
import { CustomSnackBarContext } from 'contexts/CustomSnackBarContext';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ColorField,
  ConverterOptionStack,
  QualitySlider
} from '../ConvertersToolControls';
import { convertToWebp } from './service';
import type { MultiImageInput } from '@components/input/ToolMultipleImageInput';
import type InitialValuesType from './types';

const initialValues: InitialValuesType = {
  backgroundColor: '#ffffff',
  quality: 100
};

export default function ConvertToWebp() {
  const { t } = useTranslation('converters');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [input, setInput] = useState<MultiImageInput[]>([]);
  const [options, setOptions] = useState<InitialValuesType>(initialValues);
  const [results, setResults] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input.length) {
      setResults([]);
      setZipFile(null);
      setLoading(false);
      return;
    }

    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runConversion() {
        try {
          setLoading(true);
          const output = await convertToWebp(
            input.map((image) => image.file),
            options.quality,
            options.backgroundColor
          );

          if (canceled) return;

          if (!output) {
            showSnackBar(t('convertToWebp.failedToConvert'), 'error');
            setResults([]);
            setZipFile(null);
            return;
          }

          setResults(output.convertedFiles);
          setZipFile(output.zipFile);
        } catch (error) {
          console.error('WebP conversion failed:', error);
          if (!canceled) {
            showSnackBar(t('convertToWebp.failedToConvert'), 'error');
            setResults([]);
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
              title={t('convertToWebp.inputTitle')}
            />
            <ConverterOptionStack>
              <QualitySlider
                label={t('convertToWebp.options.quality')}
                value={options.quality}
                onChange={(quality) =>
                  setOptions((current) => ({ ...current, quality }))
                }
              />
              <ColorField
                label={t('convertToWebp.options.backgroundColor')}
                value={options.backgroundColor}
                onChange={(backgroundColor) =>
                  setOptions((current) => ({ ...current, backgroundColor }))
                }
              />
            </ConverterOptionStack>
          </Stack>
        }
        result={
          zipFile ? (
            <ToolMultiFileResult
              title={t('convertToWebp.resultTitle')}
              value={results}
              zipFile={zipFile}
              loading={loading}
            />
          ) : (
            <ToolFileResult
              title={t('convertToWebp.resultTitle')}
              value={results[0] ?? null}
              extension="webp"
              loading={loading}
            />
          )
        }
      />
    </Box>
  );
}
