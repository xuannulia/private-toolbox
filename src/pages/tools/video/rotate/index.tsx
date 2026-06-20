import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactVideoToggle, VideoOptionStack } from '../VideoToolControls';
import { rotateVideo } from './service';

type RotationAngle = 90 | 180 | 270;

const initialOptions = {
  rotation: 90 as RotationAngle
};

export default function RotateVideo() {
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
      async function runRotation() {
        try {
          setLoading(true);
          const rotatedFile = await rotateVideo(inputFile, options.rotation);

          if (!canceled) setResult(rotatedFile);
        } catch (error) {
          console.error('Error rotating video:', error);
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
            <ToolVideoInput
              value={input}
              onChange={setInput}
              title={t('rotate.inputTitle')}
            />
            <VideoOptionStack>
              <CompactVideoToggle<RotationAngle>
                label={t('rotate.rotation')}
                value={options.rotation}
                options={[
                  { value: 90, label: t('rotate.90Degrees') },
                  { value: 180, label: t('rotate.180Degrees') },
                  { value: 270, label: t('rotate.270Degrees') }
                ]}
                onChange={(rotation) => setOptions({ rotation })}
              />
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('rotate.resultTitle')}
            value={result}
            extension="mp4"
            loading={loading}
            loadingText={t('rotate.rotatingVideo')}
          />
        }
      />
    </Box>
  );
}
