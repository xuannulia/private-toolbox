import { Alert, Box, Stack, Typography } from '@mui/material';
import ToolVideoInput from '@components/input/ToolVideoInput';
import ToolFileResult from '@components/result/ToolFileResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CompactVideoField, VideoOptionStack } from '../VideoToolControls';
import { cropVideo, getVideoDimensions } from './service';
import type { InitialValuesType } from './types';

const initialOptions: InitialValuesType = {
  x: 0,
  y: 0,
  width: 100,
  height: 100
};

export default function CropVideo() {
  const { t } = useTranslation('video');
  const [input, setInput] = useState<File | null>(null);
  const [options, setOptions] = useState<InitialValuesType>(initialOptions);
  const [result, setResult] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [processingError, setProcessingError] = useState('');

  function validateDimensions(values: InitialValuesType): string {
    if (!videoDimensions) return '';

    if (values.x < 0 || values.y < 0) {
      return t('cropVideo.errorNonNegativeCoordinates');
    }

    if (values.width <= 0 || values.height <= 0) {
      return t('cropVideo.errorPositiveDimensions');
    }

    if (values.x + values.width > videoDimensions.width) {
      return t('cropVideo.errorBeyondWidth', {
        width: videoDimensions.width
      });
    }

    if (values.y + values.height > videoDimensions.height) {
      return t('cropVideo.errorBeyondHeight', {
        height: videoDimensions.height
      });
    }

    return '';
  }

  async function handleInputChange(video: File | null) {
    setInput(video);
    setResult(null);

    if (!video) {
      setVideoDimensions(null);
      setProcessingError('');
      setOptions(initialOptions);
      return;
    }

    try {
      const dimensions = await getVideoDimensions(video);
      setVideoDimensions(dimensions);
      setOptions({
        x: Math.floor(dimensions.width / 4),
        y: Math.floor(dimensions.height / 4),
        width: Math.floor(dimensions.width / 2),
        height: Math.floor(dimensions.height / 2)
      });
      setProcessingError('');
    } catch (error) {
      console.error('Error getting video dimensions:', error);
      setVideoDimensions(null);
      setProcessingError(t('cropVideo.errorLoadingDimensions'));
    }
  }

  useEffect(() => {
    if (!input) {
      setLoading(false);
      return;
    }

    const error = validateDimensions(options);
    if (error) {
      setProcessingError(error);
      setResult(null);
      setLoading(false);
      return;
    }

    const inputFile = input;
    let canceled = false;
    const timeout = window.setTimeout(() => {
      async function runCrop() {
        try {
          setProcessingError('');
          setLoading(true);
          const croppedFile = await cropVideo(inputFile, options);

          if (!canceled) setResult(croppedFile);
        } catch (error) {
          console.error('Error cropping video:', error);
          if (!canceled) {
            setResult(null);
            setProcessingError(t('cropVideo.errorCroppingVideo'));
          }
        } finally {
          if (!canceled) setLoading(false);
        }
      }

      void runCrop();
    }, 700);

    return () => {
      canceled = true;
      window.clearTimeout(timeout);
    };
  }, [input, options, videoDimensions, t]);

  const updateNumberOption = (
    key: keyof InitialValuesType,
    value: string,
    minimum: number
  ) => {
    setOptions((current) => ({
      ...current,
      [key]: Math.max(minimum, Math.floor(Number(value) || minimum))
    }));
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolVideoInput
              value={input}
              onChange={handleInputChange}
              title={t('cropVideo.inputTitle')}
            />
            <VideoOptionStack>
              <Typography variant="body2" color="text.secondary">
                {videoDimensions
                  ? t('cropVideo.videoDimensions', {
                      width: videoDimensions.width,
                      height: videoDimensions.height
                    })
                  : t('cropVideo.loadVideoForDimensions')}
              </Typography>
              {processingError && (
                <Alert severity="error">{processingError}</Alert>
              )}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactVideoField
                  label={t('cropVideo.xCoordinate')}
                  value={options.x}
                  onChange={(value) => updateNumberOption('x', value, 0)}
                />
                <CompactVideoField
                  label={t('cropVideo.yCoordinate')}
                  value={options.y}
                  onChange={(value) => updateNumberOption('y', value, 0)}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <CompactVideoField
                  label={t('cropVideo.width')}
                  value={options.width}
                  onChange={(value) => updateNumberOption('width', value, 1)}
                />
                <CompactVideoField
                  label={t('cropVideo.height')}
                  value={options.height}
                  onChange={(value) => updateNumberOption('height', value, 1)}
                />
              </Stack>
            </VideoOptionStack>
          </Stack>
        }
        result={
          <ToolFileResult
            title={t('cropVideo.resultTitle')}
            value={result}
            extension="mp4"
            loading={loading}
            loadingText={t('cropVideo.croppingVideo')}
          />
        }
      />
    </Box>
  );
}
