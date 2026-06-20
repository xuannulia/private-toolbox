import { Box, Stack } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolTextResult from '@components/result/ToolTextResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import { CompactImageToggle, ImageOptionStack } from '../../ImageToolControls';
import { imageFileToBase64 } from './service';
import {
  type ImageBase64Format,
  type ImageBase64Result,
  type InitialValuesType
} from './types';

const initialOptions: InitialValuesType = {
  format: 'data_url'
};

export default function ImageToBase64() {
  const { t } = useTranslation('image');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<ImageBase64Result | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setLoading(false);
      return;
    }

    const image = input;
    let canceled = false;

    async function runConversion() {
      try {
        setLoading(true);
        const output = await imageFileToBase64(image, options.format);
        if (!canceled) setResult(output);
      } catch (error) {
        if (!canceled) {
          setResult(null);
          showSnackBar(
            error instanceof Error ? error.message : t('imageToBase64.failed'),
            'error'
          );
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    void runConversion();

    return () => {
      canceled = true;
    };
  }, [input, options, showSnackBar, t]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolImageInput
              value={input}
              onChange={setInput}
              accept={['image/*']}
              title={t('imageToBase64.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageToggle<ImageBase64Format>
                label={t('imageToBase64.formatTitle')}
                value={options.format}
                options={[
                  { value: 'data_url', label: t('imageToBase64.dataUrl') },
                  { value: 'base64', label: t('imageToBase64.base64') }
                ]}
                onChange={(format) => setOptions({ format })}
              />
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('imageToBase64.resultTitle')}
            value={result?.text ?? ''}
            extension="txt"
            monospace
            loading={loading}
          />
        }
      />
    </Box>
  );
}
