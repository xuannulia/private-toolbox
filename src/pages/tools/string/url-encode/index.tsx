import { Box, FormControlLabel, Stack, Switch } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { encodeString } from './service';

export default function EncodeString() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [encodeEveryCharacter, setEncodeEveryCharacter] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(
      encodeString(input, {
        nonSpecialChar: encodeEveryCharacter
      })
    );
  }, [encodeEveryCharacter, input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('urlEncode.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Switch
                  checked={encodeEveryCharacter}
                  onChange={(event) =>
                    setEncodeEveryCharacter(event.target.checked)
                  }
                  size="small"
                />
              }
              label={t('urlEncode.encodingOption.nonSpecialCharPlaceholder')}
            />
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('urlEncode.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
