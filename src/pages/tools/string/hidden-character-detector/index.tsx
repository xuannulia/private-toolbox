import {
  Alert,
  Box,
  FormControlLabel,
  Stack,
  Switch,
  Typography
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InitialValuesType, AnalysisResult } from './types';
import {
  analyzeHiddenCharacters,
  formatHiddenCharacterReport
} from './service';

const initialValues: InitialValuesType = {
  showUnicodeCodes: true,
  highlightRTL: true,
  showInvisibleChars: true,
  includeZeroWidthChars: true
};

export default function HiddenCharacterDetector() {
  const { t } = useTranslation('string');
  const [input, setInput] = useState('');
  const [showUnicodeCodes, setShowUnicodeCodes] = useState(
    initialValues.showUnicodeCodes
  );
  const [highlightRTL, setHighlightRTL] = useState(initialValues.highlightRTL);
  const [showInvisibleChars, setShowInvisibleChars] = useState(
    initialValues.showInvisibleChars
  );
  const [includeZeroWidthChars, setIncludeZeroWidthChars] = useState(
    initialValues.includeZeroWidthChars
  );
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!input.length) {
      setAnalysis(null);
      setResult('');
      return;
    }

    const options: InitialValuesType = {
      showUnicodeCodes,
      highlightRTL,
      showInvisibleChars,
      includeZeroWidthChars
    };
    const nextAnalysis = analyzeHiddenCharacters(input, options);
    setAnalysis(nextAnalysis);
    setResult(
      formatHiddenCharacterReport(nextAnalysis, options, {
        category: t('hiddenCharacterDetector.category'),
        foundChars: (count) =>
          t('hiddenCharacterDetector.foundChars', { count }),
        invisibleChar: t('hiddenCharacterDetector.invisibleChar'),
        noHiddenChars: t('hiddenCharacterDetector.noHiddenChars'),
        position: t('hiddenCharacterDetector.position'),
        rtlOverride: t('hiddenCharacterDetector.rtlOverride'),
        rtlWarning: t('hiddenCharacterDetector.rtlWarning'),
        truncated: t('hiddenCharacterDetector.truncated'),
        unicode: t('hiddenCharacterDetector.unicode'),
        zeroWidthChar: t('hiddenCharacterDetector.zeroWidthChar')
      })
    );
  }, [
    highlightRTL,
    includeZeroWidthChars,
    input,
    showInvisibleChars,
    showUnicodeCodes,
    t
  ]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              value={input}
              onChange={setInput}
              title={t('hiddenCharacterDetector.inputTitle')}
              placeholder={t('hiddenCharacterDetector.inputPlaceholder')}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={highlightRTL}
                    onChange={(event) => setHighlightRTL(event.target.checked)}
                    size="small"
                  />
                }
                label={t('hiddenCharacterDetector.rtlOption')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={showInvisibleChars}
                    onChange={(event) =>
                      setShowInvisibleChars(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('hiddenCharacterDetector.invisibleOption')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={includeZeroWidthChars}
                    onChange={(event) =>
                      setIncludeZeroWidthChars(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('hiddenCharacterDetector.zeroWidthOption')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Switch
                    checked={showUnicodeCodes}
                    onChange={(event) =>
                      setShowUnicodeCodes(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('hiddenCharacterDetector.unicodeOption')}
              />
            </Stack>
          </Stack>
        }
        result={
          <Stack spacing={2}>
            {analysis?.hasRTLOverride && (
              <Alert severity="warning">
                {t('hiddenCharacterDetector.rtlAlert')}
              </Alert>
            )}
            {analysis && (
              <Typography variant="body2" color="text.secondary">
                {t('hiddenCharacterDetector.totalChars', {
                  count: analysis.totalHiddenChars
                })}
              </Typography>
            )}
            <ToolTextResult
              disabled={!result}
              keepSpecialCharacters
              monospace
              title={t('hiddenCharacterDetector.resultTitle')}
              value={result}
            />
          </Stack>
        }
      />
    </Box>
  );
}
