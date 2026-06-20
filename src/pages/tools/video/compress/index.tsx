import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactVideoToggle,
  VideoOptionStack,
  VideoSlider
} from '../VideoToolControls';
import { compressVideo, type VideoResolution } from './service';

const initialOptions = {
  width: 480 as VideoResolution,
  crf: 23,
  preset: 'medium'
};

const resolutionOptions: { value: VideoResolution; label: string }[] = [
  { value: 240, label: '240p' },
  { value: 360, label: '360p' },
  { value: 480, label: '480p' },
  { value: 720, label: '720p' },
  { value: 1080, label: '1080p' }
];

export default function CompressVideo() {
  const { t } = useTranslation('video');
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

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runCompression() {
        try {
          setLoading(true);
          const compressedFile = await compressVideo(inputFile, options);

          if (!canceled) setResult(compressedFile);
        } catch (error) {
          console.error('Error compressing video:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runCompression();
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
            <ToolVideoInput
              value={input}
              onChange={setInput}
              title={t('compress.inputTitle')}
            />
            <VideoOptionStack>
              <CompactVideoToggle<VideoResolution>
                label={t('compress.resolution')}
                value={options.width}
                options={resolutionOptions}
                onChange={(width) =>
                  setOptions((current) => ({ ...current, width }))
                }
              />
              <VideoSlider
                label={t('compress.quality')}
                value={options.crf}
                min={0}
                max={51}
                marks={[
                  { value: 0, label: t('compress.lossless') },
                  { value: 23, label: t('compress.default') },
                  { value: 51, label: t('compress.worst') }
                ]}
                onChange={(crf) =>
                  setOptions((current) => ({ ...current, crf }))
                }
              />
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('compress.resultTitle')}
            value={result}
            extension="mp4"
            loading={loading}
            loadingText={t('compress.loadingText')}
          />
        }
      />
    </Box>
  );
}
