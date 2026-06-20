import { Box, Stack } from '@mui/material';
import ToolAudioInput from '@components/input/ToolAudioInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AUDIO_FORMAT_OPTIONS,
  AudioOptionStack,
  CompactAudioField,
  CompactAudioSelect
} from '../AudioToolControls';
import { trimAudio } from './service';
import type { InitialValuesType } from './types';

const initialValues: InitialValuesType = {
  startTime: '00:00:00',
  endTime: '00:01:00',
  outputFormat: 'mp3'
};

export default function Trim() {
  const { t } = useTranslation('audio');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialValues);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const updateOption = <K extends keyof InitialValuesType>(
    key: K,
    value: InitialValuesType[K]
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    if (!input) {
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runTrim() {
        try {
          setLoading(true);
          const trimmedFile = await trimAudio(inputFile, options);
          if (!canceled) setResult(trimmedFile);
        } catch (error) {
          console.error('Audio trim failed:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runTrim();
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
            <ToolAudioInput
              value={input}
              onChange={setInput}
              title={t('trim.inputTitle')}
            />
            <AudioOptionStack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactAudioField
                  label={t('trim.startTime')}
                  value={options.startTime}
                  onChange={(value) => updateOption('startTime', value)}
                />
                <CompactAudioField
                  label={t('trim.endTime')}
                  value={options.endTime}
                  onChange={(value) => updateOption('endTime', value)}
                />
              </Stack>
              <CompactAudioSelect
                label={t('trim.outputFormat')}
                value={options.outputFormat}
                options={AUDIO_FORMAT_OPTIONS}
                onChange={(outputFormat) =>
                  updateOption('outputFormat', outputFormat)
                }
              />
            </AudioOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={loading ? t('trim.trimmingAudio') : t('trim.resultTitle')}
            value={result}
            loading={loading}
            extension={result ? result.name.split('.').pop() : undefined}
          />
        }
      />
    </Box>
  );
}
