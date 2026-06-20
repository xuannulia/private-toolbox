import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  type RsaDataEncoding,
  type RsaHashAlgorithm
} from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type RsaCryptoOperation,
  rsaCryptoEncodings,
  rsaCryptoHashes,
  rsaCryptoOperations,
  runRsaCryptoTool
} from './service';

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'RSA_CRYPTO_ERROR',
      message: error instanceof Error ? error.message : 'RSA operation failed'
    },
    null,
    2
  );

export default function RsaCrypto({ title }: ToolComponentProps) {
  const { t } = useTranslation('string');
  const [operation, setOperation] = useState<RsaCryptoOperation>('encrypt');
  const [hash, setHash] = useState<RsaHashAlgorithm>('SHA-256');
  const [inputEncoding, setInputEncoding] = useState<RsaDataEncoding>('utf8');
  const [outputEncoding, setOutputEncoding] = useState<RsaDataEncoding>('utf8');
  const [keyPem, setKeyPem] = useState('');
  const [text, setText] = useState('private toolbox');
  const [signatureBase64, setSignatureBase64] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const keyLabel =
    operation === 'encrypt' || operation === 'verify'
      ? t('rsaCrypto.publicKey')
      : t('rsaCrypto.privateKey');
  const textLabel =
    operation === 'decrypt' ? t('rsaCrypto.ciphertext') : t('rsaCrypto.text');

  useEffect(() => {
    let active = true;
    const needsSignature = operation === 'verify';

    if (
      !keyPem.trim() ||
      !text.trim() ||
      (needsSignature && !signatureBase64.trim())
    ) {
      setResult('');
      return;
    }

    setLoading(true);
    runRsaCryptoTool({
      operation,
      keyPem,
      text,
      signatureBase64,
      hash,
      inputEncoding,
      outputEncoding
    })
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((error) => {
        if (active) setResult(formatError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    hash,
    inputEncoding,
    keyPem,
    operation,
    outputEncoding,
    signatureBase64,
    text
  ]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('rsaCrypto.operation')}</InputLabel>
                <Select
                  label={t('rsaCrypto.operation')}
                  value={operation}
                  onChange={(event) =>
                    setOperation(event.target.value as RsaCryptoOperation)
                  }
                >
                  {rsaCryptoOperations.map((item) => (
                    <MenuItem key={item} value={item}>
                      {t(`rsaCrypto.operations.${item}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>{t('rsaCrypto.hash')}</InputLabel>
                <Select
                  label={t('rsaCrypto.hash')}
                  value={hash}
                  onChange={(event) =>
                    setHash(event.target.value as RsaHashAlgorithm)
                  }
                >
                  {rsaCryptoHashes.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>
                  {operation === 'decrypt'
                    ? t('rsaCrypto.outputEncoding')
                    : t('rsaCrypto.inputEncoding')}
                </InputLabel>
                <Select
                  label={
                    operation === 'decrypt'
                      ? t('rsaCrypto.outputEncoding')
                      : t('rsaCrypto.inputEncoding')
                  }
                  value={
                    operation === 'decrypt' ? outputEncoding : inputEncoding
                  }
                  onChange={(event) => {
                    const value = event.target.value as RsaDataEncoding;
                    if (operation === 'decrypt') {
                      setOutputEncoding(value);
                    } else {
                      setInputEncoding(value);
                    }
                  }}
                >
                  {rsaCryptoEncodings.map((item) => (
                    <MenuItem key={item} value={item}>
                      {t(`rsaCrypto.encodings.${item}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label={keyLabel}
              value={keyPem}
              onChange={(event) => setKeyPem(event.target.value)}
              fullWidth
              multiline
              minRows={7}
              sx={{ backgroundColor: 'background.paper' }}
              inputProps={{ style: { fontFamily: 'monospace' } }}
            />
            <TextField
              label={textLabel}
              value={text}
              onChange={(event) => setText(event.target.value)}
              fullWidth
              multiline
              minRows={5}
              sx={{ backgroundColor: 'background.paper' }}
              inputProps={{ style: { fontFamily: 'monospace' } }}
            />
            {operation === 'verify' && (
              <TextField
                label={t('rsaCrypto.signature')}
                value={signatureBase64}
                onChange={(event) => setSignatureBase64(event.target.value)}
                fullWidth
                multiline
                minRows={3}
                sx={{ backgroundColor: 'background.paper' }}
                inputProps={{ style: { fontFamily: 'monospace' } }}
              />
            )}
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('rsaCrypto.resultTitle', { title })}
            value={result}
            extension="json"
            keepSpecialCharacters
            loading={loading}
            monospace
          />
        }
      />
    </Box>
  );
}
