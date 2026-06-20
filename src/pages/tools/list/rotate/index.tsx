import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactSelect,
  CompactTextField,
  ListSplitMode,
  SplitOptions,
  normalizeListSeparator
} from '../ListToolControls';
import { rotateList } from './service';

type RotateDirection = 'right' | 'left';

const formatError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Rotate list failed';

export default function Rotate() {
  const { t } = useTranslation('list');
  const [input, setInput] = useState('');
  const [splitMode, setSplitMode] = useState<ListSplitMode>('symbol');
  const [splitSeparator, setSplitSeparator] = useState(',');
  const [joinSeparator, setJoinSeparator] = useState(',');
  const [direction, setDirection] = useState<RotateDirection>('right');
  const [step, setStep] = useState('1');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!input) {
      setResult('');
      setError('');
      return;
    }

    try {
      setResult(
        rotateList(
          splitMode,
          input,
          normalizeListSeparator(splitSeparator),
          normalizeListSeparator(joinSeparator),
          direction === 'right',
          Number(step)
        )
      );
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [direction, input, joinSeparator, splitMode, splitSeparator, step]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              title={t('rotate.inputTitle')}
              value={input}
              onChange={setInput}
            />
            <SplitOptions
              splitMode={splitMode}
              splitSeparator={splitSeparator}
              joinSeparator={joinSeparator}
              labels={{
                symbol: t('common.symbolMode'),
                regex: t('common.regexMode'),
                splitSeparator: t('common.splitSeparator'),
                joinSeparator: t('common.joinSeparator')
              }}
              onSplitModeChange={setSplitMode}
              onSplitSeparatorChange={setSplitSeparator}
              onJoinSeparatorChange={setJoinSeparator}
            />
            <Stack spacing={1.5}>
              <CompactSelect
                label={t('common.direction')}
                value={direction}
                options={[
                  { label: t('rotate.directionRight'), value: 'right' },
                  { label: t('rotate.directionLeft'), value: 'left' }
                ]}
                onChange={setDirection}
              />
              <CompactTextField
                label={t('rotate.stepLabel')}
                type="number"
                value={step}
                onChange={setStep}
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
