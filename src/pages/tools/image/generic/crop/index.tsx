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

const initialOptions = {
  xPosition: '0',
  yPosition: '0',
  cropWidth: '100',
  cropHeight: '100',
  cropShape: 'rectangular' as 'rectangular' | 'circular'
};

type InitialValuesType = typeof initialOptions;

async function cropImage(
  file: File,
  options: InitialValuesType
): Promise<File | null> {
  const x = parseInt(options.xPosition);
  const y = parseInt(options.yPosition);
  const width = parseInt(options.cropWidth);
  const height = parseInt(options.cropHeight);

  if (width < 1 || height < 1 || x < 0 || y < 0) return null;

  const sourceCanvas = document.createElement('canvas');
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return null;

  const destCanvas = document.createElement('canvas');
  const destCtx = destCanvas.getContext('2d');
  if (!destCtx) return null;

  const img = new Image();
  const url = URL.createObjectURL(file);
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);

  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  sourceCtx.drawImage(img, 0, 0);

  destCanvas.width = width;
  destCanvas.height = height;

  if (options.cropShape === 'circular') {
    destCtx.beginPath();
    destCtx.arc(
      width / 2,
      height / 2,
      Math.min(width, height) / 2,
      0,
      Math.PI * 2
    );
    destCtx.closePath();
    destCtx.clip();
  }

  destCtx.drawImage(img, x, y, width, height, 0, 0, width, height);

  return new Promise((resolve) => {
    destCanvas.toBlob((blob) => {
      resolve(blob ? new File([blob], file.name, { type: file.type }) : null);
    }, file.type);
  });
}

export default function CropImage() {
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
      async function runCrop() {
        try {
          setLoading(true);
          const output = await cropImage(image, options);
          if (!canceled) setResult(output);
        } catch (error) {
          console.error('Error cropping image:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runCrop();
    }, 400);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options]);

  const updateOption = (key: keyof InitialValuesType, value: string) => {
    setOptions((current) => ({ ...current, [key]: value }));
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
              title={t('crop.inputTitle')}
              showCropOverlay={!!input}
              cropShape={options.cropShape}
              cropPosition={{
                x: parseInt(options.xPosition || '0'),
                y: parseInt(options.yPosition || '0')
              }}
              cropSize={{
                width: parseInt(options.cropWidth || '100'),
                height: parseInt(options.cropHeight || '100')
              }}
              onCropChange={(position, size) => {
                setOptions((current) => ({
                  ...current,
                  xPosition: position.x.toString(),
                  yPosition: position.y.toString(),
                  cropWidth: size.width.toString(),
                  cropHeight: size.height.toString()
                }));
              }}
            />
            <ImageOptionStack>
              <CompactImageToggle<InitialValuesType['cropShape']>
                label={t('crop.cropShape')}
                value={options.cropShape}
                options={[
                  { value: 'rectangular', label: t('crop.rectangular') },
                  { value: 'circular', label: t('crop.circular') }
                ]}
                onChange={(cropShape) =>
                  setOptions((current) => ({ ...current, cropShape }))
                }
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactImageField
                  label={t('crop.xPosition')}
                  value={options.xPosition}
                  onChange={(value) => updateOption('xPosition', value)}
                />
                <CompactImageField
                  label={t('crop.yPosition')}
                  value={options.yPosition}
                  onChange={(value) => updateOption('yPosition', value)}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactImageField
                  label={t('crop.cropWidth')}
                  value={options.cropWidth}
                  onChange={(value) => updateOption('cropWidth', value)}
                />
                <CompactImageField
                  label={t('crop.cropHeight')}
                  value={options.cropHeight}
                  onChange={(value) => updateOption('cropHeight', value)}
                />
              </Stack>
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('crop.resultTitle')}
            value={result}
            loading={loading}
            loadingText={t('crop.loadingText')}
          />
        }
      />
    </Box>
  );
}
