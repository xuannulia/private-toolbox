import { Box, MenuItem, Stack, TextField } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  runSymmetricCrypto,
  type SymmetricCryptoAlgorithm,
  type SymmetricCryptoEncoding,
  type SymmetricCryptoOperation
} from '@private-toolbox/core/tools/symmetricCrypto';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const algorithms: SymmetricCryptoAlgorithm[] = [
  'AES',
  'DES',
  'TripleDES',
  'RC4',
  'Rabbit'
];
const encodings: SymmetricCryptoEncoding[] = ['base64', 'hex'];
const operations: SymmetricCryptoOperation[] = ['encrypt', 'decrypt'];

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'SYMMETRIC_CRYPTO_ERROR',
      message:
        error instanceof Error ? error.message : 'Symmetric crypto failed'
    },
    null,
    2
  );

export default function SymmetricCrypto() {
  const { t } = useTranslation('string');
  const [operation, setOperation] =
    useState<SymmetricCryptoOperation>('encrypt');
  const [algorithm, setAlgorithm] = useState<SymmetricCryptoAlgorithm>('AES');
  const [inputEncoding, setInputEncoding] =
    useState<SymmetricCryptoEncoding>('base64');
  const [outputEncoding, setOutputEncoding] =
    useState<SymmetricCryptoEncoding>('base64');
  const [key, setKey] = useState('private-toolbox');
  const [text, setText] = useState('hello');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!text.length) {
      setResult('');
      setError('');
      return;
    }

    try {
      const output = runSymmetricCrypto({
        text,
        key,
        algorithm,
        operation,
        inputEncoding,
        outputEncoding
      });
      setResult(output.text);
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [algorithm, inputEncoding, key, operation, outputEncoding, text]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select
                fullWidth
                size="small"
                label={t('symmetricCrypto.operation')}
                value={operation}
                onChange={(event) =>
                  setOperation(event.target.value as SymmetricCryptoOperation)
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                {operations.map((item) => (
                  <MenuItem key={item} value={item}>
                    {t(`symmetricCrypto.operations.${item}`)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label={t('symmetricCrypto.algorithm')}
                value={algorithm}
                onChange={(event) =>
                  setAlgorithm(event.target.value as SymmetricCryptoAlgorithm)
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                {algorithms.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                size="small"
                label={
                  operation === 'encrypt'
                    ? t('symmetricCrypto.outputEncoding')
                    : t('symmetricCrypto.inputEncoding')
                }
                value={operation === 'encrypt' ? outputEncoding : inputEncoding}
                onChange={(event) => {
                  const value = event.target.value as SymmetricCryptoEncoding;
                  if (operation === 'encrypt') {
                    setOutputEncoding(value);
                  } else {
                    setInputEncoding(value);
                  }
                }}
                sx={{ backgroundColor: 'background.paper' }}
              >
                {encodings.map((item) => (
                  <MenuItem key={item} value={item}>
                    {t(`symmetricCrypto.encodings.${item}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              fullWidth
              size="small"
              label={t('symmetricCrypto.key')}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              sx={{ backgroundColor: 'background.paper' }}
            />
            <ToolTextInput
              title={
                operation === 'encrypt'
                  ? t('symmetricCrypto.plaintext')
                  : t('symmetricCrypto.ciphertext')
              }
              value={text}
              onChange={setText}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('symmetricCrypto.resultTitle')}
            value={error || result}
          />
        }
      />
    </Box>
  );
}
