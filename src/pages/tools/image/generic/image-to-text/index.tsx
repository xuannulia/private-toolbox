import { Box, Stack } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolTextResult from '@components/result/ToolTextResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import {
  CompactImageCheckbox,
  CompactImageSelect,
  ImageOptionStack
} from '../../ImageToolControls';
import { extractTextFromImage, getAvailableLanguages } from './service';
import { type InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  language: 'eng',
  detectParagraphs: true
};

export default function ImageToText() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSnackBar } = useContext(CustomSnackBarContext);

  useEffect(() => {
    if (!input) {
      setResult('');
      setIsProcessing(false);
      return;
    }

    const image = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runOcr() {
        try {
          setIsProcessing(true);
          const extractedText = await extractTextFromImage(image, options);
          if (!canceled) setResult(extractedText);
        } catch (error) {
          if (!canceled) {
            showSnackBar(
              error instanceof Error ? error.message : t('imageToText.failed'),
              'error'
            );
            setResult('');
          }
        } finally {
          if (!canceled) setIsProcessing(false);
        }
      }

      void runOcr();
    }, 500);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
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
              accept={['image/jpeg', 'image/png']}
              title={t('imageToText.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageSelect
                label={t('imageToText.language')}
                value={options.language}
                onChange={(language) =>
                  setOptions((current) => ({ ...current, language }))
                }
                options={getAvailableLanguages()}
              />
              <CompactImageCheckbox
                checked={options.detectParagraphs}
                onChange={(detectParagraphs) =>
                  setOptions((current) => ({ ...current, detectParagraphs }))
                }
                label={t('imageToText.detectParagraphs')}
              />
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('imageToText.resultTitle')}
            value={result}
            loading={isProcessing}
          />
        }
      />
    </Box>
  );
}
