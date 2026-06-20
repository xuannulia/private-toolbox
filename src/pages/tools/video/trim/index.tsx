import { Box, Stack } from '@mui/material';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactVideoField, VideoOptionStack } from '../VideoToolControls';

const ffmpeg = new FFmpeg();

const initialOptions = {
  trimStart: 0,
  trimEnd: 100
};

async function ensureFfmpegLoaded() {
  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      wasmURL:
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.wasm'
    });
  }
}

async function trimVideo(
  input: File,
  options: typeof initialOptions
): Promise<File> {
  await ensureFfmpegLoaded();

  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(input));
  await ffmpeg.exec([
    '-i',
    inputName,
    '-ss',
    options.trimStart.toString(),
    '-to',
    options.trimEnd.toString(),
    '-c',
    'copy',
    outputName
  ]);

  const trimmedData = await ffmpeg.readFile(outputName);

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (error) {
    console.warn('Unable to clean FFmpeg files:', error);
  }

  return new File(
    [new Blob([trimmedData as any], { type: 'video/mp4' })],
    `${input.name.replace(/\.[^/.]+$/, '')}_trimmed.mp4`,
    { type: 'video/mp4' }
  );
}

export default function TrimVideo() {
  const { t } = useTranslation('video');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input || options.trimEnd <= options.trimStart) {
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
          const trimmedFile = await trimVideo(inputFile, options);

          if (!canceled) setResult(trimmedFile);
        } catch (error) {
          console.error('Error trimming video:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runTrim();
    }, 600);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options]);

  const updateTrimOption = (
    key: keyof typeof initialOptions,
    value: string
  ) => {
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
              title={t('trim.inputTitle')}
              showTrimControls={true}
              onTrimChange={(trimStart, trimEnd) =>
                setOptions({ trimStart, trimEnd })
              }
              trimStart={options.trimStart}
              trimEnd={options.trimEnd}
            />
            <VideoOptionStack>
              <CompactVideoField
                label={t('trim.startTime')}
                value={options.trimStart}
                onChange={(value) => updateTrimOption('trimStart', value)}
              />
              <CompactVideoField
                label={t('trim.endTime')}
                value={options.trimEnd}
                onChange={(value) => updateTrimOption('trimEnd', value)}
              />
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('trim.resultTitle')}
            value={result}
            extension="mp4"
            loading={loading}
            loadingText={t('trim.trimmingVideo')}
          />
        }
      />
    </Box>
  );
}
