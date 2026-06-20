import { Box, Stack } from '@mui/material';
import ToolAudioInput from '@components/input/ToolAudioInput';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactVideoCheckbox,
  CompactVideoField,
  CompactVideoSelect,
  CompactVideoToggle,
  VideoOptionStack,
  VideoSlider
} from '../VideoToolControls';
import { addAudioToVideo } from './service';
import type { AudioMode, initialValuesType, timingMode } from './types';

const initialOptions: initialValuesType = {
  mode: 'replace',
  volume: 100,
  loop: true,
  startTime: '00:00:00',
  endTime: '00:00:00',
  timingMode: 'default'
};

export default function AddAudio() {
  const { t } = useTranslation('video');
  const [videoInput, setVideoInput] = useState<File | null>(null);
  const [audioInput, setAudioInput] = useState<File | null>(null);
  const [options, setOptions] = useState<initialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!videoInput || !audioInput) {
      setResult(null);
      setLoading(false);
      return;
    }

    const video = videoInput;
    const audio = audioInput;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runAddAudio() {
        try {
          setLoading(true);
          const outputFile = await addAudioToVideo(video, audio, options);

          if (!canceled) setResult(outputFile);
        } catch (error) {
          console.error('Error adding audio to video:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runAddAudio();
    }, 700);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [videoInput, audioInput, options]);

  const updateOptions = (nextOptions: Partial<initialValuesType>) => {
    setOptions((current) => ({ ...current, ...nextOptions }));
  };

  const setTimingMode = (timingMode: timingMode) => {
    setOptions((current) => ({
      ...current,
      timingMode,
      ...(timingMode === 'default'
        ? { startTime: '00:00:00', endTime: '00:00:00' }
        : {})
    }));
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolVideoInput
              value={videoInput}
              onChange={setVideoInput}
              title={t('addAudio.videoInputTitle')}
            />
            <ToolAudioInput
              value={audioInput}
              onChange={setAudioInput}
              title={t('addAudio.audioInputTitle')}
            />
            <VideoOptionStack>
              <CompactVideoToggle<AudioMode>
                label={t('addAudio.mode')}
                value={options.mode}
                options={[
                  { value: 'replace', label: t('addAudio.modeReplace') },
                  { value: 'mix', label: t('addAudio.modeMix') }
                ]}
                onChange={(mode) => updateOptions({ mode })}
              />
              <VideoSlider
                label={t('addAudio.volume')}
                value={options.volume}
                min={0}
                max={200}
                valueSuffix="%"
                onChange={(volume) => updateOptions({ volume })}
              />
              <CompactVideoCheckbox
                checked={options.loop}
                label={t('addAudio.loop')}
                onChange={(loop) => updateOptions({ loop })}
              />
              <CompactVideoSelect<timingMode>
                label={t('addAudio.timing')}
                value={options.timingMode}
                options={[
                  {
                    value: 'default',
                    label: t('addAudio.timingDefault')
                  },
                  {
                    value: 'start',
                    label: t('addAudio.timingStart')
                  },
                  {
                    value: 'end',
                    label: t('addAudio.timingEnd')
                  },
                  {
                    value: 'startEnd',
                    label: t('addAudio.timingStartEnd')
                  }
                ]}
                onChange={setTimingMode}
              />
              {(options.timingMode === 'start' ||
                options.timingMode === 'startEnd') && (
                <CompactVideoField
                  label={t('addAudio.startTime')}
                  value={options.startTime}
                  type="text"
                  placeholder="00:00:00"
                  onChange={(startTime) => updateOptions({ startTime })}
                />
              )}
              {(options.timingMode === 'end' ||
                options.timingMode === 'startEnd') && (
                <CompactVideoField
                  label={t('addAudio.endTime')}
                  value={options.endTime}
                  type="text"
                  placeholder="00:00:00"
                  onChange={(endTime) => updateOptions({ endTime })}
                />
              )}
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('addAudio.resultTitle')}
            value={result}
            extension="mp4"
            loading={loading}
            loadingText={t('addAudio.loadingText')}
          />
        }
      />
    </Box>
  );
}
