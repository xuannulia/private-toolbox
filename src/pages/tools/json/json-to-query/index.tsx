import { Box } from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { jsonToQuery } from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const initialJson = JSON.stringify(
  {
    q: 'private toolbox',
    page: 2,
    active: true,
    tags: ['mcp', 'local'],
    user: {
      name: 'Ada'
    }
  },
  null,
  2
);

export default function JsonToQuery({ title }: ToolComponentProps) {
  const { t } = useTranslation('json');
  const [content, setContent] = useState(initialJson);
  const [result, setResult] = useState('');

  useEffect(() => {
    try {
      setResult(jsonToQuery({ text: content }));
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Conversion failed');
    }
  }, [content]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <ToolCodeInput
            title={t('jsonToQuery.inputTitle')}
            value={content}
            onChange={setContent}
            language="json"
          />
        }
        result={
          <ToolTextResult
            title={t('jsonToQuery.resultTitle')}
            value={result}
            extension={'txt'}
            keepSpecialCharacters
            monospace
          />
        }
      />
    </Box>
  );
}
