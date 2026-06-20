import { Box, Stack } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createExtractedPublicKeyText,
  createRsaPrivateKeyInfoText
} from './service';

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'RSA_PRIVATE_KEY_ERROR',
      message:
        error instanceof Error ? error.message : 'RSA private key parse failed'
    },
    null,
    2
  );

export default function RsaPrivateKey() {
  const { t } = useTranslation('string');
  const [privateKeyPem, setPrivateKeyPem] = useState('');
  const [info, setInfo] = useState('');
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    try {
      setInfo(createRsaPrivateKeyInfoText({ privateKeyPem }));
      setPublicKey(createExtractedPublicKeyText({ privateKeyPem }));
    } catch (error) {
      setInfo(formatError(error));
      setPublicKey('');
    }
  }, [privateKeyPem]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('rsaPrivateKey.inputTitle')}
            value={privateKeyPem}
            onChange={setPrivateKeyPem}
            language="plaintext"
          />
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('rsaPrivateKey.infoTitle')}
              value={info}
              extension={'json'}
              keepSpecialCharacters
              monospace
            />
            <ToolTextResult
              title={t('rsaPrivateKey.publicKeyTitle')}
              value={publicKey}
              extension={'pem'}
              keepSpecialCharacters
              monospace
            />
          </Stack>
        }
      />
    </Box>
  );
}
