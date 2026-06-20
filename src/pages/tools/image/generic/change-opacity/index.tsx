import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import {
  CompactImageField,
  CompactImageToggle,
  ImageOptionStack
} from '../../ImageToolControls';
import { changeOpacity } from './service';

type InitialValuesType = {
  opacity: number;
  mode: 'solid' | 'gradient';
  gradientType: 'linear' | 'radial';
  gradientDirection: 'left-to-right' | 'inside-out';
  areaLeft: number;
  areaTop: number;
  areaWidth: number;
  areaHeight: number;
};

const initialOptions: InitialValuesType = {
  opacity: 0.5,
  mode: 'solid',
  gradientType: 'linear',
  gradientDirection: 'left-to-right',
  areaLeft: 0,
  areaTop: 0,
  areaWidth: 100,
  areaHeight: 100
};

export default function ChangeOpacity() {
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
      async function runOpacityChange() {
        try {
          setLoading(true);
          const output = await changeOpacity(image, options);
          if (!canceled) setResult(output);
        } catch (error) {
          console.error('Error changing opacity:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runOpacityChange();
    }, 400);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options]);

  const updateOptions = (nextOptions: Partial<InitialValuesType>) => {
    setOptions((current) => ({ ...current, ...nextOptions }));
  };

  const updateNumberOption = (
    key: keyof InitialValuesType,
    value: string,
    fallback: number
  ) => {
    updateOptions({
      [key]: Number(value) || fallback
    } as Partial<InitialValuesType>);
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolImageInput
              value={input}
              onChange={setInput}
              accept={['image/*']}
              title={t('changeOpacity.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageField
                label={t('changeOpacity.opacity')}
                value={options.opacity}
                onChange={(opacity) => {
                  const nextOpacity = Number(opacity);
                  updateOptions({
                    opacity: Math.min(
                      1,
                      Math.max(0, Number.isNaN(nextOpacity) ? 0 : nextOpacity)
                    )
                  });
                }}
              />
              <CompactImageToggle<InitialValuesType['mode']>
                label={t('changeOpacity.mode')}
                value={options.mode}
                options={[
                  { value: 'solid', label: t('changeOpacity.solid') },
                  { value: 'gradient', label: t('changeOpacity.gradient') }
                ]}
                onChange={(mode) => updateOptions({ mode })}
              />
              {options.mode === 'gradient' && (
                <>
                  <CompactImageToggle<InitialValuesType['gradientType']>
                    label={t('changeOpacity.gradientType')}
                    value={options.gradientType}
                    options={[
                      { value: 'linear', label: t('changeOpacity.linear') },
                      { value: 'radial', label: t('changeOpacity.radial') }
                    ]}
                    onChange={(gradientType) => updateOptions({ gradientType })}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <CompactImageField
                      label={t('changeOpacity.areaLeft')}
                      value={options.areaLeft}
                      onChange={(value) =>
                        updateNumberOption('areaLeft', value, 0)
                      }
                    />
                    <CompactImageField
                      label={t('changeOpacity.areaTop')}
                      value={options.areaTop}
                      onChange={(value) =>
                        updateNumberOption('areaTop', value, 0)
                      }
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <CompactImageField
                      label={t('changeOpacity.areaWidth')}
                      value={options.areaWidth}
                      onChange={(value) =>
                        updateNumberOption('areaWidth', value, 100)
                      }
                    />
                    <CompactImageField
                      label={t('changeOpacity.areaHeight')}
                      value={options.areaHeight}
                      onChange={(value) =>
                        updateNumberOption('areaHeight', value, 100)
                      }
                    />
                  </Stack>
                </>
              )}
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('changeOpacity.resultTitle')}
            value={result}
            loading={loading}
            loadingText={t('changeOpacity.loadingText')}
          />
        }
      />
    </Box>
  );
}
