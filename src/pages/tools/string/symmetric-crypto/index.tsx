import { Box, MenuItem, Stack, TextField } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  runSymmetricCrypto,
  type SymmetricCryptoAlgorithm,
  type SymmetricCryptoEncoding,
  type SymmetricCryptoKeyEncoding,
  type SymmetricCryptoMode,
  type SymmetricCryptoOperation,
  type SymmetricCryptoPadding
} from '@private-toolbox/core/tools/symmetricCrypto';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type BlockAlgorithm = Extract<
  SymmetricCryptoAlgorithm,
  'AES' | 'DES' | 'TripleDES'
>;

const algorithms: SymmetricCryptoAlgorithm[] = [
  'AES',
  'DES',
  'TripleDES',
  'RC4',
  'Rabbit'
];
const blockAlgorithms: SymmetricCryptoAlgorithm[] = ['AES', 'DES', 'TripleDES'];
const encodings: SymmetricCryptoEncoding[] = ['base64', 'hex'];
const keyEncodings: SymmetricCryptoKeyEncoding[] = ['utf8', 'hex', 'base64'];
const operations: SymmetricCryptoOperation[] = ['encrypt', 'decrypt'];
const modes: SymmetricCryptoMode[] = ['CBC', 'CFB', 'CTR', 'OFB', 'ECB'];
const paddings: SymmetricCryptoPadding[] = [
  'Pkcs7',
  'Iso97971',
  'AnsiX923',
  'Iso10126',
  'ZeroPadding',
  'NoPadding'
];

const defaultKeys: Record<SymmetricCryptoAlgorithm, string> = {
  AES: '1234567890123456',
  DES: '12345678',
  TripleDES: '123456789012345678901234',
  RC4: 'private-toolbox',
  Rabbit: '1234567890123456'
};

const defaultIvs: Record<BlockAlgorithm, string> = {
  AES: '1234567890123456',
  DES: '12345678',
  TripleDES: '12345678'
};

const isBlockAlgorithm = (
  algorithm: SymmetricCryptoAlgorithm
): algorithm is BlockAlgorithm => blockAlgorithms.includes(algorithm);

const defaultKeyValues = Object.values(defaultKeys);
const defaultIvValues = Object.values(defaultIvs);

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
  const [keyEncoding, setKeyEncoding] =
    useState<SymmetricCryptoKeyEncoding>('utf8');
  const [ivEncoding, setIvEncoding] =
    useState<SymmetricCryptoKeyEncoding>('utf8');
  const [mode, setMode] = useState<SymmetricCryptoMode>('CBC');
  const [padding, setPadding] = useState<SymmetricCryptoPadding>('Pkcs7');
  const [key, setKey] = useState(defaultKeys.AES);
  const [iv, setIv] = useState(defaultIvs.AES);
  const [text, setText] = useState('hello');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const usesBlockOptions = isBlockAlgorithm(algorithm);
  const usesIv = usesBlockOptions && mode !== 'ECB';

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
        iv: usesIv ? iv : undefined,
        algorithm,
        operation,
        inputEncoding,
        outputEncoding,
        keyEncoding,
        ivEncoding,
        mode: usesBlockOptions ? mode : undefined,
        padding: usesBlockOptions ? padding : undefined
      });
      setResult(output.text);
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [
    algorithm,
    inputEncoding,
    iv,
    ivEncoding,
    key,
    keyEncoding,
    mode,
    operation,
    outputEncoding,
    padding,
    text,
    usesBlockOptions,
    usesIv
  ]);

  const handleAlgorithmChange = (nextAlgorithm: SymmetricCryptoAlgorithm) => {
    setAlgorithm(nextAlgorithm);
    setKey((current) =>
      defaultKeyValues.includes(current) ? defaultKeys[nextAlgorithm] : current
    );

    if (isBlockAlgorithm(nextAlgorithm)) {
      setIv((current) =>
        defaultIvValues.includes(current) ? defaultIvs[nextAlgorithm] : current
      );
    }
  };

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
                  handleAlgorithmChange(
                    event.target.value as SymmetricCryptoAlgorithm
                  )
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
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label={t('symmetricCrypto.key')}
                value={key}
                onChange={(event) => setKey(event.target.value)}
                sx={{ backgroundColor: 'background.paper' }}
              />
              <TextField
                select
                fullWidth
                size="small"
                label={t('symmetricCrypto.keyEncoding')}
                value={keyEncoding}
                onChange={(event) =>
                  setKeyEncoding(
                    event.target.value as SymmetricCryptoKeyEncoding
                  )
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                {keyEncodings.map((item) => (
                  <MenuItem key={item} value={item}>
                    {t(`symmetricCrypto.encodings.${item}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            {usesBlockOptions ? (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t('symmetricCrypto.mode')}
                    value={mode}
                    onChange={(event) =>
                      setMode(event.target.value as SymmetricCryptoMode)
                    }
                    sx={{ backgroundColor: 'background.paper' }}
                  >
                    {modes.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={t('symmetricCrypto.padding')}
                    value={padding}
                    onChange={(event) =>
                      setPadding(event.target.value as SymmetricCryptoPadding)
                    }
                    sx={{ backgroundColor: 'background.paper' }}
                  >
                    {paddings.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </TextField>
                  {usesIv ? (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label={t('symmetricCrypto.ivEncoding')}
                      value={ivEncoding}
                      onChange={(event) =>
                        setIvEncoding(
                          event.target.value as SymmetricCryptoKeyEncoding
                        )
                      }
                      sx={{ backgroundColor: 'background.paper' }}
                    >
                      {keyEncodings.map((item) => (
                        <MenuItem key={item} value={item}>
                          {t(`symmetricCrypto.encodings.${item}`)}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : null}
                </Stack>
                {usesIv ? (
                  <TextField
                    fullWidth
                    size="small"
                    label={t('symmetricCrypto.iv')}
                    value={iv}
                    onChange={(event) => setIv(event.target.value)}
                    sx={{ backgroundColor: 'background.paper' }}
                  />
                ) : null}
              </>
            ) : null}
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
