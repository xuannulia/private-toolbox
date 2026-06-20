import { Box, Stack } from '@mui/material';
import { PageSizes } from 'pdf-lib';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import {
  CompactImageField,
  CompactImageSelect,
  ImageOptionStack
} from '../../ImageToolControls';
import { fromPts, splitImagesToPDF, toPts } from './service';
import { type InitialValuesType, type units } from './types';

type PageFormat = keyof typeof PageSizes;

const initialOptions: InitialValuesType = {
  pageFormat: 'A4',
  pageWidth: 210,
  pageHeight: 297,
  pxPerSquareQuantity: 1620,
  squareQuantity: 20,
  unitsPerOneSquare: fromPts(72, 'mm'),
  unitKind: 'mm',
  padding: 5
};

export default function Split() {
  const { t } = useTranslation('image');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setIsProcessing(false);
      return;
    }

    const image = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runSplit() {
        try {
          setIsProcessing(true);
          const pdfFile = await splitImagesToPDF(image, options);
          if (!canceled) setResult(pdfFile);
        } catch (error) {
          console.error('Error splitting image:', error);
          if (!canceled) setResult(null);
        } finally {
          if (!canceled) setIsProcessing(false);
        }
      }

      void runSplit();
    }, 600);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options]);

  const updateOptions = (nextOptions: Partial<InitialValuesType>) => {
    setOptions((current) => ({ ...current, ...nextOptions }));
  };

  const updateNumberOption = (
    key: keyof InitialValuesType,
    value: string,
    fallback: number
  ) => {
    updateOptions({
      [key]: Number(value) || fallback
    } as Partial<InitialValuesType>);
  };

  const setUnitKind = (unitKind: units) => {
    updateOptions({
      unitKind,
      unitsPerOneSquare: fromPts(72, unitKind),
      padding: Math.round(fromPts(toPts(5, 'mm'), unitKind) * 100) / 100
    });
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolImageInput
              value={input}
              onChange={setInput}
              accept={['image/*']}
              title={t('split.inputTitle')}
            />
            <ImageOptionStack>
              <CompactImageSelect<PageFormat>
                label={t('split.pageParameters.selectPageFormat')}
                value={options.pageFormat}
                onChange={(pageFormat) => updateOptions({ pageFormat })}
                options={(Object.keys(PageSizes) as PageFormat[]).map(
                  (key) => ({
                    value: key,
                    label: key
                  })
                )}
              />
              <CompactImageField
                label={t('split.pageParameters.padding.label')}
                value={options.padding}
                onChange={(padding) =>
                  updateNumberOption('padding', padding, 0)
                }
              />
              <CompactImageField
                label={t('split.scaleParameters.pxPerSquareQuantity.label')}
                value={options.pxPerSquareQuantity}
                onChange={(pxPerSquareQuantity) =>
                  updateNumberOption(
                    'pxPerSquareQuantity',
                    pxPerSquareQuantity,
                    1
                  )
                }
              />
              <CompactImageField
                label={t('split.scaleParameters.squareQuantity.label')}
                value={options.squareQuantity}
                onChange={(squareQuantity) =>
                  updateNumberOption('squareQuantity', squareQuantity, 1)
                }
              />
              <CompactImageField
                label={t('split.scaleParameters.unitsPerOneSquare.label')}
                value={options.unitsPerOneSquare}
                onChange={(unitsPerOneSquare) =>
                  updateNumberOption('unitsPerOneSquare', unitsPerOneSquare, 1)
                }
              />
              <CompactImageSelect<units>
                label={t('split.units.title')}
                value={options.unitKind}
                onChange={setUnitKind}
                options={[
                  { value: 'pt', label: t('split.units.options.pt') },
                  { value: 'mm', label: t('split.units.options.mm') },
                  { value: 'in', label: t('split.units.options.in') }
                ]}
              />
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('split.resultTitle')}
            extension="pdf"
            value={result}
            loading={isProcessing}
            loadingText={t('split.loadingText')}
          />
        }
      />
    </Box>
  );
}
