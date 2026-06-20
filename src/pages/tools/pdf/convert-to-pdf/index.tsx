import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolMultipleImageInput, {
  type MultiImageInput
} from '@components/input/ToolMultipleImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactPdfToggle,
  PdfOptionStack,
  PdfSlider
} from '../PdfToolControls';
import { buildPdf } from './service';
import type { InitialValuesType, Orientation, PageType } from './types';

const initialOptions: InitialValuesType = {
  pageType: 'full',
  orientation: 'portrait',
  scale: 100
};

export default function ConvertToPdf() {
  const { t } = useTranslation('pdf');
  const [input, setInput] = useState<MultiImageInput[]>([]);
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
    if (!input.length) {
      setResult(null);
      setLoading(false);
      return;
    }

    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runConversion() {
        try {
          setLoading(true);
          const files = [...input]
            .sort((a, b) => a.order - b.order)
            .map((item) => item.file);
          const { pdfFile } = await buildPdf(files, options);

          if (!canceled) setResult(pdfFile);
        } catch (error) {
          console.error('Error converting image(s) to PDF:', error);
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
            <ToolMultipleImageInput
              type="image"
              value={input}
              onChange={setInput}
              accept={[
                'image/png',
                'image/jpeg',
                'image/webp',
                'image/gif',
                'image/heic',
                'image/heif'
              ]}
              title={t('convertToPdf.inputTitle')}
            />
            <PdfOptionStack>
              <CompactPdfToggle<PageType>
                label={t('convertToPdf.options.type')}
                value={options.pageType}
                options={[
                  {
                    value: 'full',
                    label: t('convertToPdf.options.fullsize')
                  },
                  { value: 'a4', label: t('convertToPdf.options.a4') }
                ]}
                onChange={(pageType) => updateOption('pageType', pageType)}
              />
              {options.pageType === 'a4' && (
                <>
                  <CompactPdfToggle<Orientation>
                    label={t('convertToPdf.options.orientation')}
                    value={options.orientation}
                    options={[
                      {
                        value: 'portrait',
                        label: t('convertToPdf.options.portrait')
                      },
                      {
                        value: 'landscape',
                        label: t('convertToPdf.options.landscape')
                      }
                    ]}
                    onChange={(orientation) =>
                      updateOption('orientation', orientation)
                    }
                  />
                  <PdfSlider
                    label={t('convertToPdf.options.scale')}
                    value={options.scale}
                    min={10}
                    max={100}
                    onChange={(scale) => updateOption('scale', scale)}
                  />
                </>
              )}
            </PdfOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('convertToPdf.resultTitle')}
            value={result}
            extension="pdf"
            loading={loading}
          />
        }
      />
    </Box>
  );
}
