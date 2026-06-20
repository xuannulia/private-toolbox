import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolPdfInput from '@components/input/ToolPdfInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { CustomSnackBarContext } from 'contexts/CustomSnackBarContext';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactPdfField, PdfOptionStack } from '../PdfToolControls';
import { protectPdf } from './service';
import type { InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  password: '',
  confirmPassword: ''
};

export default function ProtectPdf() {
  const { t } = useTranslation('pdf');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const updateOption = <K extends keyof InitialValuesType>(
    key: K,
    value: InitialValuesType[K]
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    if (
      !input ||
      !options.password ||
      options.password !== options.confirmPassword
    ) {
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runProtection() {
        try {
          setLoading(true);
          const protectedPdf = await protectPdf(inputFile, options);

          if (!canceled) setResult(protectedPdf);
        } catch (error) {
          console.error('Error protecting PDF:', error);
          if (!canceled) {
            showSnackBar(
              t('protectPdf.errorProtectingPdf', {
                error: error instanceof Error ? error.message : String(error)
              }),
              'error'
            );
            setResult(null);
          }
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runProtection();
    }, 300);

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
            <ToolPdfInput
              value={input}
              onChange={setInput}
              accept={['application/pdf']}
              title={t('protectPdf.inputTitle')}
            />
            <PdfOptionStack>
              <CompactPdfField
                label={t('protectPdf.password')}
                type="password"
                value={options.password}
                onChange={(password) => updateOption('password', password)}
              />
              <CompactPdfField
                label={t('protectPdf.confirmPassword')}
                type="password"
                value={options.confirmPassword}
                onChange={(confirmPassword) =>
                  updateOption('confirmPassword', confirmPassword)
                }
              />
            </PdfOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('protectPdf.resultTitle')}
            value={result}
            extension="pdf"
            loading={loading}
            loadingText={t('protectPdf.loadingText')}
          />
        }
      />
    </Box>
  );
}
