import { Box, Stack } from '@mui/material';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolVideoInput from '@components/input/ToolVideoInput';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AUDIO_FORMAT_OPTIONS,
  AudioOptionStack,
  CompactAudioSelect,
  type AudioOutputFormat
} from '../AudioToolControls';
import { extractAudioFromVideo } from './service';
import type { InitialValuesType } from './types';

const initialValues: InitialValuesType = {
  outputFormat: 'aac'
};

export default function ExtractAudio() {
  const { t } = useTranslation('audio');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialValues);
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

    async function runExtraction() {
      try {
        setLoading(true);
        const audioFile = await extractAudioFromVideo(inputFile, options);
        if (!canceled) setResult(audioFile);
      } catch (error) {
        console.error('Audio extraction failed:', error);
        if (!canceled) setResult(null);
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    void runExtraction();

    return () => {
      canceled = true;
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
              title={t('extractAudio.inputTitle')}
            />
            <AudioOptionStack>
              <CompactAudioSelect<AudioOutputFormat>
                label={t('extractAudio.outputFormat')}
                value={options.outputFormat as AudioOutputFormat}
                options={AUDIO_FORMAT_OPTIONS}
                onChange={(outputFormat) => setOptions({ outputFormat })}
              />
            </AudioOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={
              loading
                ? t('extractAudio.extractingAudio')
                : t('extractAudio.resultTitle')
            }
            value={result}
            loading={loading}
          />
        }
      />
    </Box>
  );
}
