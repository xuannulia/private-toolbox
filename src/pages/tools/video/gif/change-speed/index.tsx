import { Box, Stack } from '@mui/material';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactVideoField, VideoOptionStack } from '../../VideoToolControls';

const ffmpeg = new FFmpeg();

const initialOptions = {
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

async function changeGifSpeed(
  file: File,
  options: typeof initialOptions
): Promise<File> {
  await ensureFfmpegLoaded();

  const inputName = 'input.gif';
  const outputName = 'output.gif';

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  await ffmpeg.exec([
    '-i',
    inputName,
    '-filter_complex',
    `[0:v]setpts=${
      1 / options.newSpeed
    }*PTS,split[a][b];[a]palettegen[p];[b][p]paletteuse`,
    '-f',
    'gif',
    outputName
  ]);

  const data = await ffmpeg.readFile(outputName);

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (error) {
    console.warn('Unable to clean FFmpeg files:', error);
  }

  return new File(
    [new Blob([data as any], { type: 'image/gif' })],
    file.name.replace(/\.[^/.]+$/, `-${options.newSpeed}x.gif`),
    { type: 'image/gif' }
  );
}

export default function ChangeSpeed() {
  const { t } = useTranslation('video');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState(initialOptions);
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
          const outputFile = await changeGifSpeed(inputFile, options);

          if (!canceled) setResult(outputFile);
        } catch (error) {
          console.error('Error processing GIF:', error);
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
            <ToolImageInput
              value={input}
              onChange={setInput}
              accept={['image/gif']}
              title={t('gif.changeSpeed.inputTitle')}
            />
            <VideoOptionStack>
              <CompactVideoField
                label={t('gif.changeSpeed.newGifSpeed')}
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
            title={t('gif.changeSpeed.resultTitle')}
            value={result}
            extension="gif"
            loading={loading}
            loadingText={t('gif.changeSpeed.loadingText')}
          />
        }
      />
    </Box>
  );
}
