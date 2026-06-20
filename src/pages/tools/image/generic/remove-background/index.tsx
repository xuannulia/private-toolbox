import { Box, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { removeBackground } from '@imgly/background-removal';
import * as heic2any from 'heic2any';

async function normalizeHeicImage(input: File): Promise<File> {
  if (
    input.type !== 'image/heic' &&
    !input.name?.toLowerCase().endsWith('.heic')
  ) {
    return input;
  }

  const convertedBlob = await heic2any.default({
    blob: input,
    toType: 'image/png'
  });
  const pngBlob = Array.isArray(convertedBlob)
    ? convertedBlob[0]
    : convertedBlob;

  return new File([pngBlob], input.name.replace(/\.[^/.]+$/, '') + '.png', {
    type: 'image/png'
  });
}

async function removeImageBackground(input: File): Promise<File> {
  const fileToProcess = await normalizeHeicImage(input);
  const inputUrl = URL.createObjectURL(fileToProcess);

  try {
    const blob = await removeBackground(inputUrl);

    return new File(
      [blob],
      fileToProcess.name.replace(/\.[^/.]+$/, '') + '-no-bg.png',
      {
        type: 'image/png'
      }
    );
  } finally {
    URL.revokeObjectURL(inputUrl);
  }
}

export default function RemoveBackgroundFromImage() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<File | null>(null);
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

    async function runRemoveBackground() {
      try {
        setIsProcessing(true);
        const output = await removeImageBackground(image);
        if (!canceled) setResult(output);
      } catch (error) {
        console.error('Error removing background:', error);
        if (!canceled) setResult(null);
      } finally {
        if (!canceled) setIsProcessing(false);
      }
    }

    void runRemoveBackground();

    return () => {
      canceled = true;
    };
  }, [input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolImageInput
              value={input}
              onChange={setInput}
              accept={['image/*']}
              title={t('removeBackground.inputTitle')}
            />
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('removeBackground.resultTitle')}
            value={result}
            extension="png"
            loading={isProcessing}
            loadingText={t('removeBackground.loadingText')}
          />
        }
      />
    </Box>
  );
}
