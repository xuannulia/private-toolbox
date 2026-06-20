import { Box, Stack } from '@mui/material';
import Color from 'color';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ColorSelector from '@components/options/ColorSelector';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { CompactImageField, ImageOptionStack } from '../../ImageToolControls';
import { areColorsSimilar } from 'utils/color';

const initialOptions = {
  fromColor: 'white',
  similarity: '10',
  backgroundColor: '#ffffff'
};

async function replaceColorWithBackground(
  file: File,
  options: typeof initialOptions
): Promise<File | null> {
  let fromRgb: [number, number, number];
  let bgRgb: [number, number, number];

  try {
    fromRgb = Color(options.fromColor).rgb().array() as [
      number,
      number,
      number
    ];
    bgRgb = Color(options.backgroundColor).rgb().array() as [
      number,
      number,
      number
    ];
  } catch (error) {
    return null;
  }

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

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const currentColor: [number, number, number] = [
      data[i],
      data[i + 1],
      data[i + 2]
    ];

    if (areColorsSimilar(currentColor, fromRgb, Number(options.similarity))) {
      data[i] = bgRgb[0];
      data[i + 1] = bgRgb[1];
      data[i + 2] = bgRgb[2];
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob ? new File([blob], file.name, { type: 'image/png' }) : null);
    }, 'image/png');
  });
}

export default function CreateTransparent() {
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
      async function runReplacement() {
        try {
          setLoading(true);
          const output = await replaceColorWithBackground(image, options);
          if (!canceled) setResult(output);
        } catch (error) {
          console.error('Error creating transparent image:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runReplacement();
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
              accept={['image/*']}
              title={t('createTransparent.inputTitle')}
            />
            <ImageOptionStack>
              <ColorSelector
                value={options.fromColor}
                onColorChange={(fromColor) =>
                  setOptions((current) => ({ ...current, fromColor }))
                }
                description={t('createTransparent.fromColor')}
                inputProps={{ 'data-testid': 'color-input' }}
              />
              <CompactImageField
                label={t('createTransparent.similarity')}
                value={options.similarity}
                onChange={(similarity) =>
                  setOptions((current) => ({ ...current, similarity }))
                }
              />
              <ColorSelector
                value={options.backgroundColor}
                onColorChange={(backgroundColor) =>
                  setOptions((current) => ({ ...current, backgroundColor }))
                }
                description={t('createTransparent.backgroundColor')}
              />
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('createTransparent.resultTitle')}
            value={result}
            extension="png"
            loading={loading}
            loadingText={t('createTransparent.loadingText')}
          />
        }
      />
    </Box>
  );
}
