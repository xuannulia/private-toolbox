import { Box, Stack } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import {
  CompactImageCheckbox,
  ImageOptionStack
} from '../../ImageToolControls';
import { imageFileToIcon, webIconSizes } from './service';
import { type ImageToIconOptions } from './types';

const initialOptions: ImageToIconOptions = {
  sizes: [16, 32, 48, 64, 128, 256]
};

export default function ImageToIcon() {
  const { t } = useTranslation('image');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<ImageToIconOptions>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input || !options.sizes.length) {
      setResult(null);
      setLoading(false);
      return;
    }

    const image = input;
    let canceled = false;

    async function runConversion() {
      try {
        setLoading(true);
        const output = await imageFileToIcon(image, options);
        if (!canceled) setResult(output.file);
      } catch (error) {
        if (!canceled) {
          setResult(null);
          showSnackBar(
            error instanceof Error ? error.message : t('imageToIcon.failed'),
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

  const setSizeEnabled = (
    size: ImageToIconOptions['sizes'][number],
    checked: boolean
  ) => {
    setOptions((current) => {
      const nextSizes = checked
        ? [...current.sizes, size]
        : current.sizes.filter((item) => item !== size);

      return {
        sizes: Array.from(new Set(nextSizes)).sort(
          (a, b) => a - b
        ) as ImageToIconOptions['sizes']
      };
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
              title={t('imageToIcon.inputTitle')}
            />
            <ImageOptionStack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, minmax(0, 1fr))',
                    sm: 'repeat(3, minmax(0, 1fr))'
                  },
                  columnGap: 1.5
                }}
              >
                {webIconSizes.map((size) => {
                  const checked = options.sizes.includes(size);
                  return (
                    <CompactImageCheckbox
                      key={size}
                      checked={checked}
                      disabled={checked && options.sizes.length === 1}
                      label={`${size} x ${size}`}
                      onChange={(nextChecked) =>
                        setSizeEnabled(size, nextChecked)
                      }
                    />
                  );
                })}
              </Box>
            </ImageOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('imageToIcon.resultTitle')}
            value={result}
            extension="ico"
            loading={loading}
          />
        }
      />
    </Box>
  );
}
