import { Box, MenuItem, Select, Stack, TextField } from '@mui/material';
import InputHeader from '@components/InputHeader';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { type HtpasswdScheme } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createHtpasswdLine } from './service';

const schemes: HtpasswdScheme[] = ['apr1', 'sha1'];

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'htpasswd generation failed';

export default function HtpasswdGenerator({ title }: ToolComponentProps) {
  const { t } = useTranslation('string');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('change-me');
  const [scheme, setScheme] = useState<HtpasswdScheme>('apr1');
  const [salt, setSalt] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    let active = true;

    createHtpasswdLine({
      username,
      password,
      scheme,
      salt
    })
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((error) => {
        if (active) setResult(formatError(error));
      });

    return () => {
      active = false;
    };
  }, [username, password, scheme, salt]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <Box>
              <InputHeader title={title} />
              <Stack spacing={2}>
                <TextField
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin"
                  fullWidth
                  sx={{ backgroundColor: 'background.paper' }}
                  inputProps={{ 'aria-label': t('htpasswdGenerator.username') }}
                />
                <TextField
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="change-me"
                  type="password"
                  fullWidth
                  sx={{ backgroundColor: 'background.paper' }}
                  inputProps={{ 'aria-label': t('htpasswdGenerator.password') }}
                />
              </Stack>
            </Box>
            <Box>
              <InputHeader title={t('htpasswdGenerator.optionsTitle')} />
              <Stack spacing={2}>
                <Select
                  value={scheme}
                  onChange={(event) =>
                    setScheme(event.target.value as HtpasswdScheme)
                  }
                  sx={{ backgroundColor: 'background.paper', maxWidth: 220 }}
                >
                  {schemes.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
                {scheme === 'apr1' && (
                  <TextField
                    value={salt}
                    onChange={(event) => setSalt(event.target.value)}
                    placeholder={t('htpasswdGenerator.saltPlaceholder')}
                    fullWidth
                    sx={{ backgroundColor: 'background.paper' }}
                    inputProps={{ 'aria-label': t('htpasswdGenerator.salt') }}
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('htpasswdGenerator.resultTitle')}
            value={result}
            keepSpecialCharacters
            monospace
          />
        }
      />
    </Box>
  );
}
