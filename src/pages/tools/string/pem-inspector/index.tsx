import { Box } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPemInspectionText, examplePem } from './service';

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'PEM_INSPECT_ERROR',
      message: error instanceof Error ? error.message : 'PEM inspection failed'
    },
    null,
    2
  );

export default function PemInspector() {
  const { t } = useTranslation('string');
  const [pem, setPem] = useState(examplePem);
  const [result, setResult] = useState('');

  useEffect(() => {
    let active = true;

    createPemInspectionText({ pem })
      .then((value) => {
        if (active) setResult(value);
      })
      .catch((error) => {
        if (active) setResult(formatError(error));
      });

    return () => {
      active = false;
    };
  }, [pem]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('pemInspector.inputTitle')}
            value={pem}
            onChange={setPem}
            language="plaintext"
          />
        }
        result={
          <ToolTextResult
            title={t('pemInspector.resultTitle')}
            value={result}
            extension={'json'}
            keepSpecialCharacters
            monospace
          />
        }
      />
    </Box>
  );
}
