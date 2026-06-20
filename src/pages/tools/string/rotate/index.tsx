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
import { rotateString } from './service';

type RotateDirection = 'left' | 'right';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Rotate text failed';

export default function Rotate() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [step, setStep] = useState('1');
  const [direction, setDirection] = useState<RotateDirection>('right');
  const [multiLine, setMultiLine] = useState(true);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) {
      setResult('');
      setError('');
      return;
    }

    try {
      const numericStep = Number.parseInt(step, 10) || 0;
      setResult(
        rotateString(input, numericStep, direction === 'right', multiLine)
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [direction, input, multiLine, step]);

  const output = error ? t('rotate.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={direction}
              onChange={(_, nextDirection: RotateDirection | null) => {
                if (nextDirection) {
                  setDirection(nextDirection);
                }
              }}
            >
              <ToggleButton value="right">
                {t('rotate.rotateRight')}
              </ToggleButton>
              <ToggleButton value="left">{t('rotate.rotateLeft')}</ToggleButton>
            </ToggleButtonGroup>
            <ToolTextInput
              title={t('rotate.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <Stack spacing={1.5}>
              <TextField
                label={t('rotate.stepLabel')}
                size="small"
                type="number"
                value={step}
                onChange={(event) => setStep(event.target.value)}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={multiLine}
                    onChange={(event) => setMultiLine(event.target.checked)}
                    size="small"
                  />
                }
                label={t('rotate.processAsMultiLine')}
              />
            </Stack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('rotate.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
