import { Box, Stack } from '@mui/material';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactVideoField,
  CompactVideoToggle,
  VideoOptionStack
} from '../VideoToolControls';
import type { InitialValuesType } from './types';

const ffmpeg = new FFmpeg();

const initialOptions: InitialValuesType = {
  quality: 'mid',
  fps: '10',
  scale: '320:-1:flags=bicubic',
  start: 0,
  end: 100
};

const qualityOptions: {
  value: InitialValuesType['quality'];
  fps: string;
  scale: string;
}[] = [
  {
    value: 'low',
    fps: '5',
    scale: '240:-1:flags=bilinear'
  },
  {
    value: 'mid',
    fps: '10',
    scale: '320:-1:flags=bicubic'
  },
  {
    value: 'high',
    fps: '15',
    scale: '480:-1:flags=lanczos'
  },
  {
    value: 'ultra',
    fps: '15',
    scale: '640:-1:flags=lanczos'
  }
];

async function ensureFfmpegLoaded() {
  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      wasmURL:
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm'
    });
  }
}

async function convertVideoToGif(
  file: File,
  options: InitialValuesType
): Promise<File> {
  await ensureFfmpegLoaded();

  const fileName = file.name;
  const outputName = 'output.gif';

  await ffmpeg.writeFile(fileName, await fetchFile(file));
  await ffmpeg.exec([
    '-i',
    fileName,
    '-ss',
    options.start.toString(),
    '-to',
    options.end.toString(),
    '-vf',
    `fps=${options.fps},scale=${options.scale},palettegen`,
    'palette.png'
  ]);

  await ffmpeg.exec([
    '-i',
    fileName,
    '-i',
    'palette.png',
    '-ss',
    options.start.toString(),
    '-to',
    options.end.toString(),
    '-filter_complex',
    `fps=${options.fps},scale=${options.scale}[x];[x][1:v]paletteuse`,
    outputName
  ]);

  const data = await ffmpeg.readFile(outputName);

  try {
    await ffmpeg.deleteFile(fileName);
    await ffmpeg.deleteFile('palette.png');
    await ffmpeg.deleteFile(outputName);
  } catch (error) {
    console.warn('Unable to clean FFmpeg files:', error);
  }

  return new File(
    [new Blob([data as any], { type: 'image/gif' })],
    outputName,
    {
      type: 'image/gif'
    }
  );
}

export default function VideoToGif() {
  const { t } = useTranslation('video');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input || options.end <= options.start) {
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
          const convertedFile = await convertVideoToGif(inputFile, options);

          if (!canceled) setResult(convertedFile);
        } catch (error) {
          console.error('Failed to convert video:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runConversion();
    }, 700);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options]);

  const setQuality = (quality: InitialValuesType['quality']) => {
    const nextQuality = qualityOptions.find((item) => item.value === quality);
    if (!nextQuality) return;

    setOptions((current) => ({
      ...current,
      quality,
      fps: nextQuality.fps,
      scale: nextQuality.scale
    }));
  };

  const updateTimeOption = (key: 'start' | 'end', value: string) => {
    setOptions((current) => ({
      ...current,
      [key]: Math.max(0, Number(value) || 0)
    }));
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolVideoInput
              value={input}
              onChange={setInput}
              title={t('videoToGif.inputTitle')}
              showTrimControls={true}
              onTrimChange={(start, end) =>
                setOptions((current) => ({ ...current, start, end }))
              }
              trimStart={options.start}
              trimEnd={options.end}
            />
            <VideoOptionStack>
              <CompactVideoToggle<InitialValuesType['quality']>
                label={t('videoToGif.quality')}
                value={options.quality}
                options={[
                  { value: 'low', label: t('videoToGif.low') },
                  { value: 'mid', label: t('videoToGif.mid') },
                  { value: 'high', label: t('videoToGif.high') },
                  { value: 'ultra', label: t('videoToGif.ultra') }
                ]}
                onChange={setQuality}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactVideoField
                  label={t('videoToGif.startTime')}
                  value={options.start}
                  onChange={(value) => updateTimeOption('start', value)}
                />
                <CompactVideoField
                  label={t('videoToGif.endTime')}
                  value={options.end}
                  onChange={(value) => updateTimeOption('end', value)}
                />
              </Stack>
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('videoToGif.resultTitle')}
            value={result}
            extension="gif"
            loading={loading}
            loadingText={t('videoToGif.loadingText')}
          />
        }
      />
    </Box>
  );
}
