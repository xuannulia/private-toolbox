import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { replaceSpecialCharacters } from '@utils/string';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mergeText } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Join text failed';

export default function JoinText() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [joinCharacter, setJoinCharacter] = useState('');
  const [deleteBlank, setDeleteBlank] = useState(true);
  const [deleteTrailing, setDeleteTrailing] = useState(true);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(
        mergeText(
          input,
          deleteBlank,
          deleteTrailing,
          replaceSpecialCharacters(joinCharacter)
        )
      );
    } catch (error) {
      setResult(formatError(error));
    }
  }, [deleteBlank, deleteTrailing, input, joinCharacter]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('join.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <TextField
              label={t('join.joinCharacterPlaceholder')}
              size="small"
              value={joinCharacter}
              onChange={(event) => setJoinCharacter(event.target.value)}
            />
            <Stack spacing={0.5}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={deleteBlank}
                    onChange={(event) => setDeleteBlank(event.target.checked)}
                    size="small"
                  />
                }
                label={t('join.deleteBlankTitle')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={deleteTrailing}
                    onChange={(event) =>
                      setDeleteTrailing(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('join.deleteTrailingTitle')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('join.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
