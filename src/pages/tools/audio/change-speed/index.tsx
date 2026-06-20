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
import { changeAudioSpeed } from './service';
import type { InitialValuesType } from './types';

const initialValues: InitialValuesType = {
  newSpeed: 2,
  outputFormat: 'mp3'
};

export default function ChangeSpeed() {
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
      async function runConversion() {
        try {
          setLoading(true);
          const newFile = await changeAudioSpeed(inputFile, options);
          if (!canceled) setResult(newFile);
        } catch (error) {
          console.error('Audio speed change failed:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runConversion();
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
              title={t('changeSpeed.inputTitle')}
            />
            <AudioOptionStack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactAudioField
                  label={t('changeSpeed.newAudioSpeed')}
                  value={options.newSpeed}
                  type="number"
                  onChange={(value) =>
                    updateOption('newSpeed', Number(value) || 0)
                  }
                />
                <CompactAudioSelect
                  label={t('changeSpeed.outputFormat')}
                  value={options.outputFormat}
                  options={AUDIO_FORMAT_OPTIONS}
                  onChange={(value) => updateOption('outputFormat', value)}
                />
              </Stack>
            </AudioOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={
              loading
                ? t('changeSpeed.settingSpeed')
                : t('changeSpeed.resultTitle')
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
