import { Box, Stack } from '@mui/material';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactVideoField, VideoOptionStack } from '../VideoToolControls';
import type { InitialValuesType } from './types';

const ffmpeg = new FFmpeg();

const initialOptions: InitialValuesType = {
  newSpeed: 2
};

async function ensureFfmpegLoaded() {
  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      wasmURL:
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm'
    });
  }
}

function computeAudioFilter(speed: number): string {
  if (speed <= 2 && speed >= 0.5) {
    return `atempo=${speed}`;
  }

  const filters: string[] = [];
  let remainingSpeed = speed;

  while (remainingSpeed > 2.0) {
    filters.push('atempo=2.0');
    remainingSpeed /= 2.0;
  }

  while (remainingSpeed < 0.5) {
    filters.push('atempo=0.5');
    remainingSpeed /= 0.5;
  }

  filters.push(`atempo=${remainingSpeed.toFixed(2)}`);
  return filters.join(',');
}

async function changeVideoSpeed(file: File, newSpeed: number): Promise<File> {
  await ensureFfmpegLoaded();

  const fileName = file.name;
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(fileName, await fetchFile(file));
  await ffmpeg.exec([
    '-i',
    fileName,
    '-vf',
    `setpts=${1 / newSpeed}*PTS`,
    '-filter:a',
    computeAudioFilter(newSpeed),
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-c:a',
    'aac',
    outputName
  ]);

  const data = await ffmpeg.readFile(outputName);

  try {
    await ffmpeg.deleteFile(fileName);
    await ffmpeg.deleteFile(outputName);
  } catch (error) {
    console.warn('Unable to clean FFmpeg files:', error);
  }

  return new File(
    [new Blob([data as any], { type: 'video/mp4' })],
    file.name.replace(/\.[^/.]+$/, `-${newSpeed}x.mp4`),
    { type: 'video/mp4' }
  );
}

export default function ChangeSpeed() {
  const { t } = useTranslation('video');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input || options.newSpeed <= 0) {
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runSpeedChange() {
        try {
          setLoading(true);
          const outputFile = await changeVideoSpeed(
            inputFile,
            options.newSpeed
          );

          if (!canceled) setResult(outputFile);
        } catch (error) {
          console.error('Failed to process video:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runSpeedChange();
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
              title={t('changeSpeed.inputTitle')}
            />
            <VideoOptionStack>
              <CompactVideoField
                label={t('changeSpeed.newVideoSpeed')}
                value={options.newSpeed}
                onChange={(newSpeed) =>
                  setOptions({
                    newSpeed: Math.max(0.1, Number(newSpeed) || 0.1)
                  })
                }
              />
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('changeSpeed.resultTitle')}
            value={result}
            extension="mp4"
            loading={loading}
            loadingText={t('changeSpeed.settingSpeed')}
          />
        }
      />
    </Box>
  );
}
