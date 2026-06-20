import { Box, MenuItem, Select, Stack } from '@mui/material';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import InputHeader from '@components/InputHeader';
import { type HashAlgorithm } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createTextHash } from './service';

const algorithms: HashAlgorithm[] = [
  'MD5',
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512'
];

export default function TextHash({ title }: ToolComponentProps) {
  const { t } = useTranslation('string');
  const [text, setText] = useState('hello');
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [result, setResult] = useState('');

  useEffect(() => {
    let active = true;

    createTextHash({ text, algorithm })
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((error) => {
        if (active) {
          setResult(error instanceof Error ? error.message : 'Hash failed');
        }
      });

    return () => {
      active = false;
    };
  }, [text, algorithm]);

  return (
    <ToolInputAndResult
      input={
        <Stack spacing={2}>
          <ToolTextInput
            title={t('textHash.inputTitle')}
            value={text}
            onChange={setText}
          />
          <Box>
            <InputHeader title={t('textHash.optionsTitle')} />
            <Select
              value={algorithm}
              onChange={(event) =>
                setAlgorithm(event.target.value as HashAlgorithm)
              }
              sx={{ backgroundColor: 'background.paper', minWidth: 180 }}
            >
              {algorithms.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Stack>
      }
      result={
        <ToolTextResult
          title={t('textHash.resultTitle')}
          value={result}
          keepSpecialCharacters
          monospace
        />
      }
    />
  );
}
