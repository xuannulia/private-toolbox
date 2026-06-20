import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CompactTextField,
  normalizeCsvToken
} from '../CsvToolControls';
import { csvRowsToColumns } from './service';

export default function CsvRowsToColumns() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [emptyValuesFilling, setEmptyValuesFilling] = useState(false);
  const [customFiller, setCustomFiller] = useState('x');
  const [commentCharacter, setCommentCharacter] = useState('//');
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(
      csvRowsToColumns(
        input,
        emptyValuesFilling,
        customFiller,
        normalizeCsvToken(commentCharacter)
      )
    );
  }, [commentCharacter, customFiller, emptyValuesFilling, input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('common.inputCsv')}
              value={input}
              onChange={setInput}
            />
            <Stack spacing={1.5}>
              <CompactCheckbox
                checked={emptyValuesFilling}
                label={t('common.fillMissingWithEmpty')}
                onChange={setEmptyValuesFilling}
              />
              {!emptyValuesFilling && (
                <CompactTextField
                  label={t('common.fillValue')}
                  value={customFiller}
                  onChange={setCustomFiller}
                />
              )}
              <CompactTextField
                label={t('common.comment')}
                value={commentCharacter}
                onChange={setCommentCharacter}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            extension="csv"
            keepSpecialCharacters
            monospace
            title={t('common.outputCsv')}
            value={result}
          />
        }
      />
    </Box>
  );
}
