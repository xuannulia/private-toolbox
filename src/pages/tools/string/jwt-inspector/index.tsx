import { Box } from '@mui/material';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { inspectJwt } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const exampleToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJwcml2YXRlLXRvb2xib3giLCJzdWIiOiJ1c2VyLTEiLCJhdWQiOlsiY29kZXgiLCJjbGF1ZGUiXSwiaWF0IjoxNzgxODI3MjAwLCJuYmYiOjE3ODE4MjcyMDAsImV4cCI6MTc4MTkxMzYwMH0.' +
  'example-signature';

const formatResult = (value: unknown): string => JSON.stringify(value, null, 2);

export default function JwtInspector({ title }: ToolComponentProps) {
  const { t } = useTranslation('string');
  const [token, setToken] = useState(exampleToken);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(formatResult(inspectJwt({ token })));
    } catch (error) {
      setResult(
        formatResult({
          error: error instanceof Error ? error.message : 'JWT decode failed'
        })
      );
    }
  }, [token]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('jwtInspector.inputTitle')}
            value={token}
            onChange={setToken}
            placeholder="eyJhbGciOi..."
          />
        }
        result={
          <ToolTextResult
            title={t('jwtInspector.resultTitle')}
            value={result}
            extension={'json'}
            keepSpecialCharacters
          />
        }
      />
    </Box>
  );
}
