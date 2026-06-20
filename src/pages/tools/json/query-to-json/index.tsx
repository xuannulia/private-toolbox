import { Box } from '@mui/material';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { queryToJson } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const initialQuery =
  '?q=private+toolbox&page=2&active=true&tags=mcp&tags=local&user.name=Ada';

export default function QueryToJson({ title }: ToolComponentProps) {
  const { t } = useTranslation('json');
  const [content, setContent] = useState(initialQuery);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(queryToJson({ text: content }));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Conversion failed');
    }
  }, [content]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolTextInput
            title={t('queryToJson.inputTitle')}
            value={content}
            onChange={setContent}
          />
        }
        result={
          <ToolTextResult
            title={t('queryToJson.resultTitle')}
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
