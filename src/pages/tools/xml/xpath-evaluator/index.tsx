import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField
} from '@mui/material';
import ToolCodeInput from '@components/input/ToolCodeInput';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { runXPathTool } from './service';

const initialXml = `<catalog>
  <book id="b1">
    <title>Private Toolbox</title>
    <price currency="CNY">99</price>
  </book>
  <book id="b2">
    <title>Private Toolbox Notes</title>
    <price currency="USD">29</price>
  </book>
</catalog>`;

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      valid: false,
      error: error instanceof Error ? error.message : 'XPath evaluation failed'
    },
    null,
    2
  );

export default function XPathEvaluator({ title }: ToolComponentProps) {
  const { t } = useTranslation('xml');
  const [text, setText] = useState(initialXml);
  const [expression, setExpression] = useState('//book[@id="b2"]/title');
  const [namespacesText, setNamespacesText] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [includeXml, setIncludeXml] = useState(true);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!text.trim() || !expression.trim()) {
      setResult('');
      return;
    }

    try {
      setResult(
        runXPathTool({
          text,
          expression,
          namespacesText,
          maxResults,
          includeXml
        })
      );
    } catch (error) {
      setResult(formatError(error));
    }
  }, [expression, includeXml, maxResults, namespacesText, text]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <TextField
              label={t('xpathEvaluator.expression')}
              value={expression}
              onChange={(event) => setExpression(event.target.value)}
              fullWidth
              size="small"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label={t('xpathEvaluator.namespaces')}
                value={namespacesText}
                onChange={(event) => setNamespacesText(event.target.value)}
                fullWidth
                size="small"
                placeholder='{"x":"https://example.test/ns"}'
              />
              <TextField
                label={t('xpathEvaluator.maxResults')}
                value={maxResults}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value > 0) {
                    setMaxResults(value);
                  }
                }}
                type="number"
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 132 } }}
                inputProps={{ min: 1, max: 500 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeXml}
                    onChange={(event) => setIncludeXml(event.target.checked)}
                  />
                }
                label={t('xpathEvaluator.includeXml')}
                sx={{ flexShrink: 0, mx: 0 }}
              />
            </Stack>
            <ToolCodeInput
              title={t('xpathEvaluator.inputTitle')}
              value={text}
              onChange={setText}
              language="xml"
            />
          </Stack>
        }
        result={
          <ToolTextResult
            title={t('xpathEvaluator.resultTitle')}
            value={result}
            extension="json"
            keepSpecialCharacters
            monospace
          />
        }
      />
    </Box>
  );
}
