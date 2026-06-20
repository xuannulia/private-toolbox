import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import {
  Box,
  Collapse,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme
} from '@mui/material';
import ResultFooter from '@components/result/ResultFooter';
import React, { Fragment, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSnackBarContext } from '../../../../contexts/CustomSnackBarContext';
import { globalInputHeight } from '../../../../config/uiConfig';
import {
  formatJsonPrimitive,
  getJsonNodeSummary,
  parseJsonResult
} from './jsonResult';

type ViewMode = 'text' | 'tree';
type JsonNodeName = string | number;
type TokenType =
  | 'key'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'punctuation';

type HighlightToken = {
  text: string;
  type?: TokenType;
};

const jsonTokenPattern =
  /"(?:\\u[a-fA-F0-9]{4}|\\["\\/bfnrt]|[^\\"])*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\],:]/g;

const tokenizeJson = (value: string): HighlightToken[] => {
  const tokens: HighlightToken[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(jsonTokenPattern)) {
    const index = match.index ?? 0;
    const text = match[0];

    if (index > lastIndex) {
      tokens.push({ text: value.slice(lastIndex, index) });
    }

    const afterToken = value.slice(index + text.length);
    const type: TokenType = text.startsWith('"')
      ? /^\s*:/.test(afterToken)
        ? 'key'
        : 'string'
      : text === 'true' || text === 'false'
        ? 'boolean'
        : text === 'null'
          ? 'null'
          : /^-?\d/.test(text)
            ? 'number'
            : 'punctuation';

    tokens.push({ text, type });
    lastIndex = index + text.length;
  }

  if (lastIndex < value.length) {
    tokens.push({ text: value.slice(lastIndex) });
  }

  return tokens;
};

const isJsonContainer = (value: unknown) =>
  Array.isArray(value) || (value !== null && typeof value === 'object');

const getJsonEntries = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      key: index,
      value: item
    }));
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => ({
        key,
        value: item
      })
    );
  }

  return [];
};

const formatNodeName = (name: JsonNodeName) =>
  typeof name === 'number' ? `[${name}]` : JSON.stringify(name);

function JsonEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        alignItems: 'center',
        color: 'text.secondary',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        minHeight: 160
      }}
    >
      <Typography variant="body2">{children}</Typography>
    </Box>
  );
}

function HighlightedJson({ value }: { value: string }) {
  const theme = useTheme();
  const tokens = useMemo(() => tokenizeJson(value), [value]);
  const colors: Record<TokenType, string> = {
    key: theme.palette.mode === 'dark' ? '#7dd3fc' : '#0550ae',
    string: theme.palette.mode === 'dark' ? '#86efac' : '#116329',
    number: theme.palette.mode === 'dark' ? '#f9a8d4' : '#8250df',
    boolean: theme.palette.mode === 'dark' ? '#fdba74' : '#953800',
    null: theme.palette.mode === 'dark' ? '#c4b5fd' : '#6e7781',
    punctuation: theme.palette.text.secondary
  };

  return (
    <Box
      component="pre"
      data-testid="json-highlight-result"
      sx={{
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.65,
        m: 0,
        minWidth: 'max-content',
        whiteSpace: 'pre'
      }}
    >
      {tokens.map((token, index) =>
        token.type ? (
          <Box
            component="span"
            key={`${index}-${token.text}`}
            sx={{ color: colors[token.type] }}
          >
            {token.text}
          </Box>
        ) : (
          <Fragment key={`${index}-${token.text}`}>{token.text}</Fragment>
        )
      )}
    </Box>
  );
}

function JsonTreeNode({
  depth,
  name,
  value
}: {
  depth: number;
  name?: JsonNodeName;
  value: unknown;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const container = isJsonContainer(value);

  if (!container) {
    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'baseline',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 13,
          minHeight: 26,
          pl: depth * 2 + 4.5
        }}
      >
        {name !== undefined && (
          <Typography
            component="span"
            sx={{ color: 'primary.main', fontFamily: 'inherit', fontSize: 13 }}
          >
            {formatNodeName(name)}:
          </Typography>
        )}
        <Typography
          component="span"
          sx={{
            color:
              value === null
                ? 'text.secondary'
                : typeof value === 'string'
                  ? 'success.dark'
                  : typeof value === 'number'
                    ? 'secondary.main'
                    : 'warning.dark',
            fontFamily: 'inherit',
            fontSize: 13,
            wordBreak: 'break-word'
          }}
        >
          {formatJsonPrimitive(value)}
        </Typography>
      </Stack>
    );
  }

  const entries = getJsonEntries(value);

  return (
    <Box>
      <Stack
        direction="row"
        onClick={() => setExpanded((current) => !current)}
        sx={{
          alignItems: 'center',
          cursor: 'pointer',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          minHeight: 28,
          pl: depth * 2
        }}
      >
        <IconButton
          aria-label={expanded ? 'collapse' : 'expand'}
          size="small"
          sx={{ height: 28, width: 28 }}
        >
          {expanded ? (
            <KeyboardArrowDownIcon fontSize="small" />
          ) : (
            <KeyboardArrowRightIcon fontSize="small" />
          )}
        </IconButton>
        {name !== undefined && (
          <Typography
            component="span"
            sx={{
              color: 'primary.main',
              fontFamily: 'inherit',
              fontSize: 13,
              mr: 1
            }}
          >
            {formatNodeName(name)}
          </Typography>
        )}
        <Typography
          component="span"
          sx={{
            color: 'text.secondary',
            fontFamily: 'inherit',
            fontSize: 13
          }}
        >
          {Array.isArray(value) ? '[]' : '{}'} {getJsonNodeSummary(value)}
        </Typography>
      </Stack>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {entries.map((entry) => (
          <JsonTreeNode
            depth={depth + 1}
            key={entry.key}
            name={entry.key}
            value={entry.value}
          />
        ))}
      </Collapse>
    </Box>
  );
}

function JsonTree({ value }: { value: string }) {
  const { t } = useTranslation('json');
  const parsed = useMemo(() => parseJsonResult(value), [value]);

  if (!value.trim()) {
    return <JsonEmptyState>{t('prettify.emptyTree')}</JsonEmptyState>;
  }

  if (!parsed.ok) {
    return (
      <JsonEmptyState>
        {t('prettify.invalidTree')}: {parsed.error}
      </JsonEmptyState>
    );
  }

  return (
    <Box data-testid="json-tree-result">
      <JsonTreeNode depth={0} value={parsed.value} />
    </Box>
  );
}

export default function JsonResultView({
  error,
  title,
  value
}: {
  error?: string;
  title: string;
  value: string;
}) {
  const { t } = useTranslation('json');
  const { t: commonT } = useTranslation();
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [mode, setMode] = useState<ViewMode>('text');

  const handleCopy = () => {
    navigator.clipboard
      .writeText(value)
      .then(() => showSnackBar(commonT('toolTextResult.copied'), 'success'))
      .catch((err) => {
        showSnackBar(
          commonT('toolTextResult.copyFailed', { error: err }),
          'error'
        );
      });
  };

  const handleDownload = () => {
    const blob = new Blob([value], {
      type: 'application/json;charset=utf-8'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'private-toolbox-output.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Stack
        mb={1}
        spacing={1.5}
        sx={{
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between'
        }}
      >
        <Typography fontSize={16} fontWeight={600}>
          {title}
        </Typography>
        <ToggleButtonGroup
          exclusive
          onChange={(_, nextMode: ViewMode | null) => {
            if (nextMode) setMode(nextMode);
          }}
          size="small"
          value={mode}
        >
          <ToggleButton value="text">{t('prettify.textView')}</ToggleButton>
          <ToggleButton value="tree">{t('prettify.treeView')}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Paper
        variant="outlined"
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 1,
          height: globalInputHeight + 7,
          overflow: 'auto',
          p: 1.5
        }}
      >
        {error ? (
          <JsonEmptyState>{error}</JsonEmptyState>
        ) : mode === 'text' ? (
          value.trim() ? (
            <HighlightedJson value={value} />
          ) : (
            <JsonEmptyState>{t('prettify.emptyTree')}</JsonEmptyState>
          )
        ) : (
          <JsonTree value={value} />
        )}
      </Paper>
      <ResultFooter
        disabled={!value.trim() || Boolean(error)}
        handleCopy={handleCopy}
        handleDownload={handleDownload}
      />
    </Box>
  );
}
