import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolMultipleImageInput, {
  MultiImageInput
} from '@components/input/ToolMultipleImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolMultiFileResult from '@components/result/ToolMultiFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import {
  CompactImageCheckbox,
  CompactImageField,
  CompactImageToggle,
  ImageOptionStack
} from '../../ImageToolControls';
import { resizeImages } from './service';
import { type InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  resizeMethod: 'pixels',
  dimensionType: 'width',
  width: '800',
  height: '600',
  percentage: '50',
  maintainAspectRatio: true
};

export default function ResizeImage() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<MultiImageInput[]>([]);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [results, setResults] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!input.length) {
      setResults([]);
      setZipFile(null);
      setIsProcessing(false);
      return;
    }

    const files = input.map((image) => image.file);
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runResize() {
        try {
          setIsProcessing(true);
          setResults([]);
          setZipFile(null);

          const output = await resizeImages(files, options);

          if (!canceled && output) {
            setResults(output.results);
            setZipFile(output.zipFile);
          }
        } catch (error) {
          console.error('Error in resizing:', error);
          if (!canceled) {
            setResults([]);
            setZipFile(null);
          }
        } finally {
          if (!canceled) setIsProcessing(false);
        }
      }

      void runResize();
    }, 500);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options]);

  const updateOptions = (nextOptions: Partial<InitialValuesType>) => {
    setOptions((current) => ({ ...current, ...nextOptions }));
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolMultipleImageInput
              value={input}
              onChange={setInput}
              type="image"
              accept={[
                'image/jpeg',
                'image/png',
                'image/svg+xml',
                'image/gif',
                'image/webp'
              ]}
              title={t('resize.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageToggle<InitialValuesType['resizeMethod']>
                label={t('resize.resizeMethod')}
                value={options.resizeMethod}
                options={[
                  { value: 'pixels', label: t('resize.resizeByPixels') },
                  {
                    value: 'percentage',
                    label: t('resize.resizeByPercentage')
                  }
                ]}
                onChange={(resizeMethod) => updateOptions({ resizeMethod })}
              />
              {options.resizeMethod === 'pixels' ? (
                <>
                  <CompactImageCheckbox
                    checked={options.maintainAspectRatio}
                    onChange={(maintainAspectRatio) =>
                      updateOptions({ maintainAspectRatio })
                    }
                    label={t('resize.maintainAspectRatio')}
                  />
                  {options.maintainAspectRatio && (
                    <CompactImageToggle<InitialValuesType['dimensionType']>
                      label={t('resize.dimensionType')}
                      value={options.dimensionType}
                      options={[
                        { value: 'width', label: t('resize.setWidth') },
                        { value: 'height', label: t('resize.setHeight') }
                      ]}
                      onChange={(dimensionType) =>
                        updateOptions({ dimensionType })
                      }
                    />
                  )}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <CompactImageField
                      label={t('resize.width')}
                      value={options.width}
                      disabled={
                        options.maintainAspectRatio &&
                        options.dimensionType === 'height'
                      }
                      onChange={(width) => updateOptions({ width })}
                    />
                    <CompactImageField
                      label={t('resize.height')}
                      value={options.height}
                      disabled={
                        options.maintainAspectRatio &&
                        options.dimensionType === 'width'
                      }
                      onChange={(height) => updateOptions({ height })}
                    />
                  </Stack>
                </>
              ) : (
                <CompactImageField
                  label={t('resize.percentage')}
                  value={options.percentage}
                  onChange={(percentage) => updateOptions({ percentage })}
                />
              )}
            </ImageOptionStack>
          </Stack>
        }
        result={
          zipFile ? (
            <ToolMultiFileResult
              title={t('resize.resultTitle')}
              value={results}
              zipFile={zipFile}
              loading={isProcessing}
            />
          ) : (
            <ToolFileResult
              title={t('resize.resultTitle')}
              value={results[0] ?? null}
              extension={results[0]?.name.split('.').pop() || 'png'}
              loading={isProcessing}
              loadingText={t('resize.loadingText')}
            />
          )
        }
      />
    </Box>
  );
}
