import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactVideoToggle, VideoOptionStack } from '../VideoToolControls';
import { flipVideo } from './service';
import type { FlipOrientation, InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  orientation: 'horizontal'
};

export default function FlipVideo() {
  const { t } = useTranslation('video');
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

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runFlip() {
        try {
          setLoading(true);
          const flippedFile = await flipVideo(inputFile, options.orientation);

          if (!canceled) setResult(flippedFile);
        } catch (error) {
          console.error('Error flipping video:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runFlip();
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
            <ToolVideoInput
              value={input}
              onChange={setInput}
              title={t('flip.inputTitle')}
            />
            <VideoOptionStack>
              <CompactVideoToggle<FlipOrientation>
                label={t('flip.orientation')}
                value={options.orientation}
                options={[
                  {
                    value: 'horizontal',
                    label: t('flip.horizontalLabel')
                  },
                  {
                    value: 'vertical',
                    label: t('flip.verticalLabel')
                  }
                ]}
                onChange={(orientation) => setOptions({ orientation })}
              />
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('flip.resultTitle')}
            value={result}
            extension="mp4"
            loading={loading}
            loadingText={t('flip.flippingVideo')}
          />
        }
      />
    </Box>
  );
}
