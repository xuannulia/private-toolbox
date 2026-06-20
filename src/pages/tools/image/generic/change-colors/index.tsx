import { Box, Stack } from '@mui/material';
import Color from 'color';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ColorSelector from '@components/options/ColorSelector';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import {
  CompactImageField,
  CompactImageToggle,
  ImageOptionStack
} from '../../ImageToolControls';
import { processImage } from './service';
import { type InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  fromColor: '#ffffffff',
  toColor: '#000000ff',
  similarity: 10
};

export default function ChangeColorsInImage() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setIsProcessing(false);
      return;
    }

    const image = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runReplacement() {
        let fromRgb: [number, number, number, number];
        let toRgb: [number, number, number, number];

        try {
          fromRgb = [
            ...Color(options.fromColor).rgb().array(),
            Color(options.fromColor).alpha() * 255
          ] as [number, number, number, number];
          toRgb = [
            ...Color(options.toColor).rgb().array(),
            Color(options.toColor).alpha() * 255
          ] as [number, number, number, number];
        } catch (error) {
          if (!canceled) setResult(null);
          return;
        }

        try {
          setIsProcessing(true);
          const output = await processImage(
            image,
            fromRgb,
            toRgb,
            options.similarity
          );

          if (!canceled) setResult(output);
        } catch (error) {
          console.error('Error changing colors:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setIsProcessing(false);
        }
      }

      void runReplacement();
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
            <ToolImageInput
              value={input}
              onChange={setInput}
              accept={['image/*']}
              title={t('changeColors.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageToggle<'color' | 'transparent'>
                label={t('changeColors.fromColor.title')}
                value={
                  options.fromColor === '#00000000' ? 'transparent' : 'color'
                }
                options={[
                  {
                    value: 'color',
                    label: t('changeColors.fromColor.colorOption')
                  },
                  {
                    value: 'transparent',
                    label: t('changeColors.fromColor.transparentOption')
                  }
                ]}
                onChange={(mode) =>
                  updateOptions({
                    fromColor:
                      mode === 'transparent' ? '#00000000' : '#ffffffff'
                  })
                }
              />
              {options.fromColor !== '#00000000' && (
                <ColorSelector
                  value={options.fromColor}
                  onColorChange={(fromColor) => updateOptions({ fromColor })}
                  description={t('changeColors.fromColor.selectorDescription')}
                  inputProps={{ 'data-testid': 'from-color-input' }}
                />
              )}
              <CompactImageField
                label={t('changeColors.similarity')}
                value={options.similarity}
                onChange={(similarity) =>
                  updateOptions({
                    similarity: Math.min(
                      100,
                      Math.max(0, Number(similarity) || 0)
                    )
                  })
                }
              />
              <CompactImageToggle<'color' | 'transparent'>
                label={t('changeColors.toColor.title')}
                value={
                  options.toColor === '#00000000' ? 'transparent' : 'color'
                }
                options={[
                  {
                    value: 'color',
                    label: t('changeColors.toColor.colorOption')
                  },
                  {
                    value: 'transparent',
                    label: t('changeColors.toColor.transparentOption')
                  }
                ]}
                onChange={(mode) =>
                  updateOptions({
                    toColor: mode === 'transparent' ? '#00000000' : '#000000ff'
                  })
                }
              />
              {options.toColor !== '#00000000' && (
                <ColorSelector
                  value={options.toColor}
                  onColorChange={(toColor) => updateOptions({ toColor })}
                  description={t('changeColors.toColor.selectorDescription')}
                  inputProps={{ 'data-testid': 'to-color-input' }}
                />
              )}
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('changeColors.resultTitle')}
            value={result}
            loading={isProcessing}
            loadingText={t('changeColors.loadingText')}
          />
        }
      />
    </Box>
  );
}
