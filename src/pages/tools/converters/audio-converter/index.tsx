import { Box, Stack } from '@mui/material';
import ToolAudioInput from '@components/input/ToolAudioInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolFileResult from '@components/result/ToolFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactSelect, ConverterOptionStack } from '../ConvertersToolControls';
import { convertAudio } from './service';
import { AUDIO_FORMATS } from './types';
import type { AudioFormat, InitialValuesType } from './types';

export default function AudioConverter() {
  const { t } = useTranslation('converters');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>({
    outputFormat: 'mp3'
  });
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

    async function runConversion() {
      try {
        setLoading(true);
        const nextResult = await convertAudio(inputFile, options);
        if (!canceled) setResult(nextResult);
      } catch (error) {
        console.error('Audio conversion failed:', error);
        if (!canceled) setResult(null);
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    void runConversion();

    return () => {
      canceled = true;
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
              title={t('audioConverter.inputTitle')}
            />
            <ConverterOptionStack>
              <CompactSelect<AudioFormat>
                label={t('audioConverter.outputFormat')}
                value={options.outputFormat}
                options={Object.keys(AUDIO_FORMATS).map((format) => ({
                  label: format.toUpperCase(),
                  value: format as AudioFormat
                }))}
                onChange={(outputFormat) => setOptions({ outputFormat })}
              />
            </ConverterOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            value={result}
            title={t('audioConverter.outputTitle')}
            loading={loading}
          />
        }
      />
    </Box>
  );
}
