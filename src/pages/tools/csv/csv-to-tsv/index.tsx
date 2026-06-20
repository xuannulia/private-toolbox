import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CsvFormatFields,
  normalizeCsvToken
} from '../CsvToolControls';
import { csvToTsv } from './service';

export default function CsvToTsv() {
  const { t } = useTranslation('csv');
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [quoteCharacter, setQuoteCharacter] = useState('"');
  const [commentCharacter, setCommentCharacter] = useState('#');
  const [header, setHeader] = useState(true);
  const [emptyLines, setEmptyLines] = useState(true);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(
      csvToTsv(
        input,
        normalizeCsvToken(delimiter),
        normalizeCsvToken(quoteCharacter),
        normalizeCsvToken(commentCharacter),
        header,
        emptyLines
      )
    );
  }, [commentCharacter, delimiter, emptyLines, header, input, quoteCharacter]);

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
            <CsvFormatFields
              delimiter={delimiter}
              quote={quoteCharacter}
              comment={commentCharacter}
              labels={{
                delimiter: t('common.inputDelimiter'),
                quote: t('common.quote'),
                comment: t('common.comment')
              }}
              onDelimiterChange={setDelimiter}
              onQuoteChange={setQuoteCharacter}
              onCommentChange={setCommentCharacter}
            />
            <Stack spacing={0.5}>
              <CompactCheckbox
                checked={header}
                label={t('common.useHeaders')}
                onChange={setHeader}
              />
              <CompactCheckbox
                checked={emptyLines}
                label={t('common.skipEmptyLines')}
                onChange={setEmptyLines}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            extension="tsv"
            keepSpecialCharacters
            monospace
            title={t('common.outputTsv')}
            value={result}
          />
        }
      />
    </Box>
  );
}
