import { Box, Stack } from '@mui/material';
import Color from 'color';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ColorSelector from '@components/options/ColorSelector';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import {
  CompactImageCheckbox,
  CompactImageField,
  ImageOptionStack
} from '../../ImageToolControls';
import { areColorsSimilar } from 'utils/color';

const initialOptions = {
  enableTransparency: false,
  color: 'white',
  similarity: '10'
};

async function convertJpgToPng(
  file: File,
  options: typeof initialOptions
): Promise<File | null> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const img = new Image();
  const url = URL.createObjectURL(file);
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  if (options.enableTransparency) {
    let rgb: [number, number, number];
    try {
      rgb = Color(options.color).rgb().array() as [number, number, number];
    } catch (error) {
      return null;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const currentColor: [number, number, number] = [
        data[i],
        data[i + 1],
        data[i + 2]
      ];
      if (areColorsSimilar(currentColor, rgb, Number(options.similarity))) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob ? new File([blob], file.name, { type: 'image/png' }) : null);
    }, 'image/png');
  });
}

export default function ConvertJgpToPng() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState(initialOptions);
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
      async function runConversion() {
        try {
          setLoading(true);
          const output = await convertJpgToPng(image, options);
          if (!canceled) setResult(output);
        } catch (error) {
          console.error('Error converting JPG to PNG:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runConversion();
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
              accept={['image/jpeg']}
              title={t('convertJgpToPng.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageCheckbox
                checked={options.enableTransparency}
                label={t('convertJgpToPng.enableTransparency')}
                onChange={(enableTransparency) =>
                  setOptions((current) => ({
                    ...current,
                    enableTransparency
                  }))
                }
              />
              {options.enableTransparency && (
                <>
                  <ColorSelector
                    value={options.color}
                    onColorChange={(color) =>
                      setOptions((current) => ({ ...current, color }))
                    }
                    description={t('convertJgpToPng.color')}
                    inputProps={{ 'data-testid': 'color-input' }}
                  />
                  <CompactImageField
                    label={t('convertJgpToPng.similarity')}
                    value={options.similarity}
                    onChange={(similarity) =>
                      setOptions((current) => ({ ...current, similarity }))
                    }
                  />
                </>
              )}
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('convertJgpToPng.resultTitle')}
            value={result}
            extension="png"
            loading={loading}
            loadingText={t('convertJgpToPng.loadingText')}
          />
        }
      />
    </Box>
  );
}
