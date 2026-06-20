import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactVideoField, VideoOptionStack } from '../VideoToolControls';
import { loopVideo } from './service';
import type { InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  loops: 2
};

export default function Loop() {
  const { t } = useTranslation('video');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input || options.loops < 1) {
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runLoop() {
        try {
          setLoading(true);
          const resultFile = await loopVideo(inputFile, options);

          if (!canceled) setResult(resultFile);
        } catch (error) {
          console.error('Error looping video:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runLoop();
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
              title={t('loop.inputTitle')}
            />
            <VideoOptionStack>
              <CompactVideoField
                label={t('loop.numberOfLoops')}
                value={options.loops}
                onChange={(loops) =>
                  setOptions({ loops: Math.max(1, Number(loops) || 1) })
                }
              />
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('loop.resultTitle')}
            value={result}
            extension="mp4"
            loading={loading}
            loadingText={t('loop.loopingVideo')}
          />
        }
      />
    </Box>
  );
}
