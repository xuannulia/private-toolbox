import { Box, Stack } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolImageInput from '@components/input/ToolImageInput';
import ToolTextResult from '@components/result/ToolTextResult';
import ToolInputAndResult from '@components/ToolInputAndResult';
import { CustomSnackBarContext } from '../../../../../contexts/CustomSnackBarContext';
import { decodeQrCodeFile, formatDecodedQrCode } from './service';

export default function QrCodeDecode() {
  const { t } = useTranslation('image');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [input, setInput] = useState<File | null>(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) {
      setResult('');
      setLoading(false);
      return;
    }

    const image = input;
    let canceled = false;

    async function runDecode() {
      try {
        setLoading(true);
        const decodedText = formatDecodedQrCode(await decodeQrCodeFile(image));
        if (!canceled) setResult(decodedText);
      } catch (error) {
        if (!canceled) {
          setResult('');
          showSnackBar(
            error instanceof Error ? error.message : t('qrCodeDecode.failed'),
            'error'
          );
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    void runDecode();

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
              title={t('qrCodeDecode.inputTitle')}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('qrCodeDecode.resultTitle')}
            value={result}
            extension="txt"
            monospace
            loading={loading}
          />
        }
      />
    </Box>
  );
}
