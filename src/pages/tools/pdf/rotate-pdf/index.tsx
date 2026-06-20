import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolPdfInput from '@components/input/ToolPdfInput';
import ToolFileResult from '@components/result/ToolFileResult';
import { PDFDocument } from 'pdf-lib';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactPdfField,
  CompactPdfSwitch,
  CompactPdfToggle,
  PdfOptionStack,
  PdfStatList
} from '../PdfToolControls';
import { parsePageRanges, rotatePdf } from './service';
import type { InitialValuesType, RotationAngle } from './types';

const initialOptions: InitialValuesType = {
  rotationAngle: 90,
  applyToAllPages: true,
  pageRanges: ''
};

export default function RotatePdf() {
  const { t } = useTranslation('pdf');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const updateOption = <K extends keyof InitialValuesType>(
    key: K,
    value: InitialValuesType[K]
  ) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    if (!input) {
      setTotalPages(0);
      return;
    }

    let canceled = false;

    async function readPdfInfo() {
      try {
        const arrayBuffer = await input!.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);

        if (!canceled) setTotalPages(pdf.getPageCount());
      } catch (error) {
        console.error('Error getting PDF info:', error);
        if (!canceled) setTotalPages(0);
      }
    }

    void readPdfInfo();

    return () => {
      canceled = true;
    };
  }, [input]);

  useEffect(() => {
    if (!input || (!options.applyToAllPages && !options.pageRanges.trim())) {
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runRotation() {
        try {
          setLoading(true);
          const rotatedPdf = await rotatePdf(inputFile, options);

          if (!canceled) setResult(rotatedPdf);
        } catch (error) {
          console.error('Error rotating PDF:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runRotation();
    }, 300);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options]);

  const pageRangePreview = useMemo(() => {
    if (!totalPages) return '';

    if (options.applyToAllPages) {
      return t('rotatePdf.allPagesWillBeRotated', {
        count: totalPages,
        plural: totalPages === 1 ? '' : 's'
      });
    }

    if (!options.pageRanges.trim()) return '';

    const count = parsePageRanges(options.pageRanges, totalPages).length;
    if (!count) return '';

    return t('rotatePdf.pagesWillBeRotated', {
      count,
      plural: count === 1 ? '' : 's'
    });
  }, [options, totalPages, t]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolPdfInput
              value={input}
              onChange={setInput}
              accept={['application/pdf']}
              title={t('rotatePdf.inputTitle')}
            />
            <PdfOptionStack>
              <CompactPdfToggle<RotationAngle>
                label={t('rotatePdf.rotationAngle')}
                value={options.rotationAngle}
                options={[
                  {
                    value: 90,
                    label: t('rotatePdf.angleOptions.clockwise90')
                  },
                  {
                    value: 180,
                    label: t('rotatePdf.angleOptions.upsideDown180')
                  },
                  {
                    value: 270,
                    label: t('rotatePdf.angleOptions.counterClockwise270')
                  }
                ]}
                onChange={(rotationAngle) =>
                  updateOption('rotationAngle', rotationAngle)
                }
              />
              <CompactPdfSwitch
                checked={options.applyToAllPages}
                label={t('rotatePdf.applyToAllPages')}
                onChange={(applyToAllPages) =>
                  updateOption('applyToAllPages', applyToAllPages)
                }
              />
              {!options.applyToAllPages && (
                <CompactPdfField
                  label={t('rotatePdf.pageRanges')}
                  value={options.pageRanges}
                  placeholder={t('rotatePdf.pageRangesPlaceholder')}
                  onChange={(pageRanges) =>
                    updateOption('pageRanges', pageRanges)
                  }
                />
              )}
              <PdfStatList
                items={[
                  {
                    label: t('rotatePdf.pdfPageCountLabel'),
                    value: totalPages || undefined
                  },
                  {
                    label: t('rotatePdf.previewLabel'),
                    value: pageRangePreview
                  }
                ]}
              />
            </PdfOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('rotatePdf.resultTitle')}
            value={result}
            extension="pdf"
            loading={loading}
            loadingText={t('rotatePdf.rotatingPages')}
          />
        }
      />
    </Box>
  );
}
