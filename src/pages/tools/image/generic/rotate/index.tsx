import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import {
  CompactImageField,
  CompactImageSelect,
  CompactImageToggle,
  ImageOptionStack
} from '../../ImageToolControls';
import { processImage } from './service';
import { type InitialValuesType } from './type';

const initialOptions: InitialValuesType = {
  rotateAngle: '90',
  rotateMethod: 'Preset'
};

export default function RotateImage() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setLoading(false);
      return;
    }

    const image = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runRotation() {
        try {
          setLoading(true);
          const output = await processImage(image, options);
          if (!canceled) setResult(output);
        } catch (error) {
          console.error('Error rotating image:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runRotation();
    }, 300);

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
              title={t('rotate.inputTitle')}
              accept={['image/*']}
            />
            <ImageOptionStack>
              <CompactImageToggle<InitialValuesType['rotateMethod']>
                label={t('rotate.rotateMethod')}
                value={options.rotateMethod}
                options={[
                  { value: 'Preset', label: t('rotate.presetAngle') },
                  { value: 'Custom', label: t('rotate.customAngle') }
                ]}
                onChange={(rotateMethod) =>
                  setOptions((current) => ({ ...current, rotateMethod }))
                }
              />
              {options.rotateMethod === 'Preset' ? (
                <CompactImageSelect
                  label={t('rotate.presetAngle')}
                  value={options.rotateAngle}
                  options={[
                    { label: '90°', value: '90' },
                    { label: '180°', value: '180' },
                    { label: '270°', value: '270' }
                  ]}
                  onChange={(rotateAngle) =>
                    setOptions((current) => ({ ...current, rotateAngle }))
                  }
                />
              ) : (
                <CompactImageField
                  label={t('rotate.customAngle')}
                  value={options.rotateAngle}
                  onChange={(rotateAngle) =>
                    setOptions((current) => ({ ...current, rotateAngle }))
                  }
                />
              )}
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            value={result}
            title={t('rotate.resultTitle')}
            extension={input?.name.split('.').pop() || 'png'}
            loading={loading}
            loadingText={t('rotate.loadingText')}
          />
        }
      />
    </Box>
  );
}
