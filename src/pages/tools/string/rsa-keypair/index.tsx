import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { Icon } from '@iconify/react';
import {
  generateRsaKeyPair,
  type RsaHashAlgorithm,
  type RsaKeyPairAlgorithm,
  type RsaModulusLength
} from '@private-toolbox/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const algorithms: RsaKeyPairAlgorithm[] = ['RSA-OAEP', 'RSASSA-PKCS1-v1_5'];
const hashes: RsaHashAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512'];
const modulusLengths: RsaModulusLength[] = [2048, 3072, 4096];

export default function RsaKeyPair() {
  const { t } = useTranslation('string');
  const [algorithm, setAlgorithm] = useState<RsaKeyPairAlgorithm>('RSA-OAEP');
  const [hash, setHash] = useState<RsaHashAlgorithm>('SHA-256');
  const [modulusLength, setModulusLength] = useState<RsaModulusLength>(2048);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);

    try {
      const keyPair = await generateRsaKeyPair({
        algorithm,
        hash,
        modulusLength
      });

      setResult(`${keyPair.publicKeyPem}\n\n${keyPair.privateKeyPem}`);
    } catch (error) {
      setResult(
        JSON.stringify(
          {
            code: 'RSA_GENERATE_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to generate key pair'
          },
          null,
          2
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const input = (
    <Box>
      <Stack spacing={1.5}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, minmax(0, 1fr))'
            },
            gap: 1.5
          }}
        >
          <FormControl fullWidth size={'small'}>
            <InputLabel>{t('rsaKeyPair.algorithm')}</InputLabel>
            <Select
              label={t('rsaKeyPair.algorithm')}
              value={algorithm}
              onChange={(event) =>
                setAlgorithm(event.target.value as RsaKeyPairAlgorithm)
              }
              sx={{ backgroundColor: 'background.paper' }}
            >
              {algorithms.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size={'small'}>
            <InputLabel>{t('rsaKeyPair.modulusLength')}</InputLabel>
            <Select
              label={t('rsaKeyPair.modulusLength')}
              value={String(modulusLength)}
              onChange={(event) =>
                setModulusLength(Number(event.target.value) as RsaModulusLength)
              }
              sx={{ backgroundColor: 'background.paper' }}
            >
              {modulusLengths.map((item) => (
                <MenuItem key={item} value={String(item)}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size={'small'}>
            <InputLabel>{t('rsaKeyPair.hash')}</InputLabel>
            <Select
              label={t('rsaKeyPair.hash')}
              value={hash}
              onChange={(event) =>
                setHash(event.target.value as RsaHashAlgorithm)
              }
              sx={{ backgroundColor: 'background.paper' }}
            >
              {hashes.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button
          variant={'contained'}
          startIcon={<Icon icon="material-symbols:vpn-key" />}
          onClick={generate}
          disabled={loading}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('rsaKeyPair.generate')}
        </Button>
      </Stack>
    </Box>
  );

  return (
    <ToolInputAndResult
      input={input}
      result={
        <ToolTextResult
          title={t('rsaKeyPair.resultTitle')}
          value={result}
          extension={'pem'}
          keepSpecialCharacters
          loading={loading}
        />
      }
    />
  );
}
