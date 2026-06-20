import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initialValues, InitialValuesType } from './initialValues';
import { generatePassword } from './service';

export default function PasswordGenerator() {
  const { t } = useTranslation('string');
  const [length, setLength] = useState(initialValues.length);
  const [includeLowercase, setIncludeLowercase] = useState(
    initialValues.includeLowercase
  );
  const [includeUppercase, setIncludeUppercase] = useState(
    initialValues.includeUppercase
  );
  const [includeNumbers, setIncludeNumbers] = useState(
    initialValues.includeNumbers
  );
  const [includeSymbols, setIncludeSymbols] = useState(
    initialValues.includeSymbols
  );
  const [avoidAmbiguous, setAvoidAmbiguous] = useState(
    initialValues.avoidAmbiguous
  );
  const [generationCount, setGenerationCount] = useState(0);
  const [result, setResult] = useState('');

  useEffect(() => {
    const options: InitialValuesType = {
      length,
      includeLowercase,
      includeUppercase,
      includeNumbers,
      includeSymbols,
      avoidAmbiguous
    };
    setResult(generatePassword(options));
  }, [
    avoidAmbiguous,
    generationCount,
    includeLowercase,
    includeNumbers,
    includeSymbols,
    includeUppercase,
    length
  ]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <TextField
              label={t('passwordGenerator.lengthDesc')}
              size="small"
              type="number"
              value={length}
              onChange={(event) => setLength(event.target.value)}
            />
            <Stack spacing={1}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={includeLowercase}
                    onChange={(event) =>
                      setIncludeLowercase(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('passwordGenerator.includeLowercase')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={includeUppercase}
                    onChange={(event) =>
                      setIncludeUppercase(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('passwordGenerator.includeUppercase')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={includeNumbers}
                    onChange={(event) =>
                      setIncludeNumbers(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('passwordGenerator.includeNumbers')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={includeSymbols}
                    onChange={(event) =>
                      setIncludeSymbols(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('passwordGenerator.includeSymbols')}
              />
              <FormControlLabel
                sx={{ m: 0 }}
                control={
                  <Checkbox
                    checked={avoidAmbiguous}
                    onChange={(event) =>
                      setAvoidAmbiguous(event.target.checked)
                    }
                    size="small"
                  />
                }
                label={t('passwordGenerator.avoidAmbiguous')}
              />
            </Stack>
            <Button
              startIcon={<RefreshIcon />}
              variant="contained"
              onClick={() => setGenerationCount((count) => count + 1)}
            >
              {t('passwordGenerator.generate')}
            </Button>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('passwordGenerator.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
