import { Box, Stack } from '@mui/material';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolMultipleAudioInput from '@components/input/ToolMultipleAudioInput';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AUDIO_FORMAT_OPTIONS,
  AudioOptionStack,
  CompactAudioSelect
} from '../AudioToolControls';
import { mergeAudioFiles } from './service';
import type { MultiAudioInput } from '@components/input/ToolMultipleAudioInput';
import type { InitialValuesType } from './types';

const initialValues: InitialValuesType = {
  outputFormat: 'mp3'
};

export default function MergeAudio() {
  const { t } = useTranslation('audio');
  const [input, setInput] = useState<MultiAudioInput[]>([]);
  const [options, setOptions] = useState<InitialValuesType>(initialValues);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (input.length === 0) {
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFiles = input.map((item) => item.file);
    let canceled = false;

    async function runMerge() {
      try {
        setLoading(true);
        const mergedFile = await mergeAudioFiles(inputFiles, options);
        if (!canceled) setResult(mergedFile);
      } catch (error) {
        console.error('Audio merge failed:', error);
        if (!canceled) setResult(null);
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    void runMerge();

    return () => {
      canceled = true;
    };
  }, [input, options]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolMultipleAudioInput
              value={input}
              onChange={setInput}
              accept={['audio/*', '.mp3', '.wav', '.aac']}
              title={t('mergeAudio.inputTitle')}
              type="audio"
            />
            <AudioOptionStack>
              <CompactAudioSelect
                label={t('mergeAudio.outputFormat')}
                value={options.outputFormat}
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
                ? t('mergeAudio.mergingAudio')
                : t('mergeAudio.resultTitle')
            }
            value={result}
            loading={loading}
            extension={result ? result.name.split('.').pop() : undefined}
          />
        }
      />
    </Box>
  );
}
