import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initialValues, truncationSideType } from './initialValues';
import { truncateText } from './service';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Truncate text failed';

export default function Truncate() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [truncationSide, setTruncationSide] =
    useState<truncationSideType>('right');
  const [maxLength, setMaxLength] = useState(initialValues.maxLength);
  const [lineByLine, setLineByLine] = useState(false);
  const [addIndicator, setAddIndicator] = useState(false);
  const [indicator, setIndicator] = useState(initialValues.indicator);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setResult(
        truncateText(
          {
            ...initialValues,
            textToTruncate: input,
            truncationSide,
            maxLength,
            lineByLine,
            addIndicator,
            indicator
          },
          input
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [addIndicator, indicator, input, lineByLine, maxLength, truncationSide]);

  const output = error ? t('truncate.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={truncationSide}
              onChange={(_, nextSide: truncationSideType | null) => {
                if (nextSide) {
                  setTruncationSide(nextSide);
                }
              }}
            >
              <ToggleButton value="right">
                {t('truncate.rightSideTruncation')}
              </ToggleButton>
              <ToggleButton value="left">
                {t('truncate.leftSideTruncation')}
              </ToggleButton>
            </ToggleButtonGroup>
            <ToolTextInput
              title={t('truncate.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Stack spacing={1.5}>
              <TextField
                label={t('truncate.maxLengthLabel')}
                size="small"
                type="number"
                value={maxLength}
                onChange={(event) => setMaxLength(event.target.value)}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={lineByLine}
                    onChange={(event) => setLineByLine(event.target.checked)}
                    size="small"
                  />
                }
                label={t('truncate.lineByLineTruncating')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={addIndicator}
                    onChange={(event) => setAddIndicator(event.target.checked)}
                    size="small"
                  />
                }
                label={t('truncate.addTruncationIndicator')}
              />
              {addIndicator && (
                <TextField
                  label={t('truncate.indicatorLabel')}
                  size="small"
                  value={indicator}
                  onChange={(event) => setIndicator(event.target.value)}
                />
              )}
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('truncate.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
