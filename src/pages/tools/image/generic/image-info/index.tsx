import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InputHeader from '@components/InputHeader';
import ToolImageInput from '@components/input/ToolImageInput';
import ResultFooter from '@components/result/ResultFooter';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { globalInputHeight } from '../../../../../config/uiConfig';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import { inspectImageFile } from './service';
import { type ImageInfoResult } from './types';

const toJson = (value: ImageInfoResult): string =>
  JSON.stringify(value, null, 2);

function ImageInfoResultView({
  resultTitle,
  value,
  loading
}: {
  resultTitle: string;
  value: ImageInfoResult | null;
  loading: boolean;
}) {
  const { t } = useTranslation('image');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const jsonValue = useMemo(() => (value ? toJson(value) : ''), [value]);

  const rows = value
    ? [
        [t('imageInfo.fields.name'), value.name],
        [
          t('imageInfo.fields.size'),
          `${value.sizeText} (${value.sizeBytes} B)`
        ],
        [t('imageInfo.fields.mimeType'), value.mimeType],
        [t('imageInfo.fields.extension'), value.extension || '-'],
        [t('imageInfo.fields.dimensions'), `${value.width} x ${value.height}`],
        [t('imageInfo.fields.aspectRatio'), value.aspectRatioText],
        [
          t('imageInfo.fields.orientation'),
          t(`imageInfo.orientation.${value.orientation}`)
        ],
        [t('imageInfo.fields.pixelCount'), value.pixelCount.toLocaleString()],
        [t('imageInfo.fields.megapixels'), value.megapixels.toString()],
        [
          t('imageInfo.fields.hasAlpha'),
          value.hasAlpha === null
            ? t('imageInfo.alpha.unknown')
            : value.hasAlpha
              ? t('imageInfo.alpha.yes')
              : t('imageInfo.alpha.no')
        ],
        [
          t('imageInfo.fields.modifiedAt'),
          new Date(value.modifiedAt).toLocaleString()
        ]
      ]
    : [];

  const handleCopy = () => {
    if (!jsonValue) return;

    navigator.clipboard
      .writeText(jsonValue)
      .then(() => showSnackBar(t('imageInfo.copied'), 'success'))
      .catch((error) =>
        showSnackBar(
          error instanceof Error ? error.message : t('imageInfo.copyFailed'),
          'error'
        )
      );
  };

  const handleDownload = () => {
    if (!jsonValue) return;

    const blob = new Blob([jsonValue], {
      type: 'application/json;charset=utf-8'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'private-toolbox-image-info.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <InputHeader title={resultTitle} />
      <Box
        sx={{
          minHeight: globalInputHeight,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          p: 2
        }}
      >
        {loading ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: globalInputHeight - 32 }}
          >
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={0}>
            {rows.map(([label, rowValue]) => (
              <Box
                key={label}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    sm: '140px minmax(0, 1fr)'
                  },
                  gap: { xs: 0.5, sm: 2 },
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 0
                  }
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  {label}
                </Typography>
                <Typography sx={{ overflowWrap: 'anywhere' }}>
                  {rowValue}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
      <ResultFooter
        disabled={!value}
        handleCopy={handleCopy}
        handleDownload={handleDownload}
      />
    </Box>
  );
}

export default function ImageInfo() {
  const { t } = useTranslation('image');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [input, setInput] = useState<File | null>(null);
  const [result, setResult] = useState<ImageInfoResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) {
      setResult(null);
      setLoading(false);
      return;
    }

    const image = input;
    let canceled = false;

    async function runInspect() {
      try {
        setLoading(true);
        const output = await inspectImageFile(image);
        if (!canceled) setResult(output);
      } catch (error) {
        if (!canceled) {
          setResult(null);
          showSnackBar(
            error instanceof Error ? error.message : t('imageInfo.failed'),
            'error'
          );
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    void runInspect();

    return () => {
      canceled = true;
    };
  }, [input, showSnackBar, t]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolImageInput
              value={input}
              onChange={setInput}
              accept={['image/*']}
              title={t('imageInfo.inputTitle')}
            />
          </Stack>
        }
        result={
          <ImageInfoResultView
            resultTitle={t('imageInfo.resultTitle')}
            value={result}
            loading={loading}
          />
        }
      />
    </Box>
  );
}
