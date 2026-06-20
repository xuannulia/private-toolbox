import { Box, Stack } from '@mui/material';
import ToolMultipleVideoInput, {
  MultiVideoInput
} from '@components/input/ToolMultipleVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mergeVideos } from './service';
import type { InitialValuesType } from './types';

const initialOptions: InitialValuesType = {};

export default function MergeVideo() {
  const { t } = useTranslation('video');
  const [input, setInput] = useState<MultiVideoInput[]>([]);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (input.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }

    const files = [...input]
      .sort((left, right) => left.order - right.order)
      .map((item) => item.file);
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runMerge() {
        try {
          setLoading(true);
          const mergedBlob = await mergeVideos(files, initialOptions);
          const mergedFile = new File([mergedBlob], 'merged-video.mp4', {
            type: 'video/mp4'
          });

          if (!canceled) setResult(mergedFile);
        } catch (error) {
          console.error('Error merging videos:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runMerge();
    }, 500);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolMultipleVideoInput
              value={input}
              onChange={setInput}
              accept={['video/*', '.mp4', '.avi', '.mov', '.mkv']}
              title={t('mergeVideo.inputTitle')}
              type="video"
            />
          </Stack>
        }
        result={
          <ToolFileResult
            value={result}
            title={t('mergeVideo.resultTitle')}
            loading={loading}
            loadingText={t('mergeVideo.loadingText')}
            extension="mp4"
          />
        }
      />
    </Box>
  );
}
