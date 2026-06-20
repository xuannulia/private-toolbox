import {
  Autocomplete,
  Box,
  Chip,
  darken,
  lighten,
  Stack,
  styled,
  TextField,
  useTheme
} from '@mui/material';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { type DefinedTool } from '@tools/defineTool';
import { filterTools, tools } from '@tools/index';
import { useNavigate } from 'react-router-dom';
import { getToolCategoryTitle } from '@utils/string';
import { useTranslation } from 'react-i18next';
import { type I18nNamespaces, validNamespaces } from '../i18n';
import type { TFunction } from 'i18next';
import {
  getBookmarkedToolPaths,
  isBookmarked,
  toggleBookmarked
} from '@utils/bookmark';
import { getRecentToolPaths, recordRecentTool } from '@utils/recentTools';
import IconButton from '@mui/material/IconButton';
import ToolCategoryIcon from './ToolCategoryIcon';

const toolSearchNamespaces = validNamespaces.filter(
  (namespace) => namespace !== 'translation'
);

const getFallbackToolLabel = (tool: DefinedTool) => {
  const segment = tool.path.split('/').at(-1) ?? tool.path;

  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const GroupHeader = styled('div')(({ theme }) => ({
  position: 'sticky',
  top: '-8px',
  padding: '4px 10px',
  color: theme.palette.primary.main,
  backgroundColor: lighten(theme.palette.primary.light, 0.85),
  ...theme.applyStyles('dark', {
    backgroundColor: darken(theme.palette.primary.main, 0.8)
  })
}));

const GroupItems = styled('ul')({
  padding: 0
});

type ToolInfo = {
  label: string;
  url: string;
};

type ToolChipRowProps = {
  title: string;
  tools: ToolInfo[];
  onDelete?: (tool: ToolInfo) => void;
  onOpen: (tool: ToolInfo) => void;
};

const ToolChipRow = ({ title, tools, onDelete, onOpen }: ToolChipRowProps) => {
  if (tools.length === 0) return null;

  return (
    <Stack direction={'row'} alignItems={'center'} gap={1} flexWrap={'wrap'}>
      <Typography
        color={'text.secondary'}
        fontSize={12}
        fontWeight={700}
        sx={{ minWidth: 48 }}
      >
        {title}
      </Typography>
      {tools.map((tool) => (
        <Chip
          key={tool.url}
          size={'small'}
          label={tool.label}
          variant={'outlined'}
          onClick={() => onOpen(tool)}
          onDelete={
            onDelete
              ? (event) => {
                  event.stopPropagation();
                  onDelete(tool);
                }
              : undefined
          }
          sx={{
            borderRadius: 1,
            backgroundColor: 'background.paper'
          }}
        />
      ))}
    </Stack>
  );
};

export default function Hero() {
  const { t, i18n } = useTranslation('translation');
  const [inputValue, setInputValue] = useState<string>('');
  const theme = useTheme();
  const [bookmarkedToolPaths, setBookmarkedToolPaths] = useState<string[]>(
    getBookmarkedToolPaths()
  );
  const [recentToolPaths] = useState<string[]>(getRecentToolPaths());
  const navigate = useNavigate();
  const [toolNamespacesLoaded, setToolNamespacesLoaded] = useState(() =>
    toolSearchNamespaces.every((namespace) =>
      i18n.hasLoadedNamespace(namespace)
    )
  );
  const [toolNamespacesLoading, setToolNamespacesLoading] = useState(false);
  const typedT = t as unknown as TFunction<I18nNamespaces[]>;

  useEffect(() => {
    setToolNamespacesLoaded(
      toolSearchNamespaces.every((namespace) =>
        i18n.hasLoadedNamespace(namespace)
      )
    );
  }, [i18n, i18n.language]);

  const ensureToolNamespaces = useCallback(() => {
    if (
      toolSearchNamespaces.every((namespace) =>
        i18n.hasLoadedNamespace(namespace)
      )
    ) {
      setToolNamespacesLoaded(true);
      return;
    }

    setToolNamespacesLoading(true);
    void i18n.loadNamespaces(toolSearchNamespaces).then(() => {
      setToolNamespacesLoaded(true);
      setToolNamespacesLoading(false);
    });
  }, [i18n, i18n.language]);

  const filteredTools = useMemo(
    () =>
      filterTools(tools, toolNamespacesLoaded ? inputValue : '', [], typedT),
    [inputValue, toolNamespacesLoaded, typedT]
  );

  const exampleTools: ToolInfo[] = [
    {
      label: t('hero.examples.prettifyJson'),
      url: '/json/prettify'
    },
    {
      label: t('hero.examples.regexToolkit'),
      url: '/string/regex-toolkit'
    },
    {
      label: t('hero.examples.crontabGuru'),
      url: '/time/crontab-guru'
    },
    {
      label: t('hero.examples.dnsLookup'),
      url: '/network/dns-lookup'
    },
    {
      label: t('hero.examples.ipLookup'),
      url: '/network/ip-lookup'
    },
    {
      label: t('hero.examples.rsaKeyPair'),
      url: '/string/rsa-keypair'
    },
    {
      label: t('hero.examples.qrCodeGenerator'),
      url: '/image-generic/qr-code'
    },
    {
      label: t('hero.examples.dockerCompose'),
      url: '/ops/docker-compose'
    },
    {
      label: t('hero.examples.nginxFormat'),
      url: '/ops/nginx-format'
    }
  ];

  const handleInputChange = (_event: SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);

    if (newInputValue.trim()) {
      ensureToolNamespaces();
    }
  };

  const toolsByPath = useMemo(
    () => new Map(tools.map((tool) => [tool.path, tool])),
    []
  );

  const getToolLabel = useCallback(
    (tool: DefinedTool) =>
      toolNamespacesLoaded ? typedT(tool.name) : getFallbackToolLabel(tool),
    [toolNamespacesLoaded, typedT]
  );

  const resolveToolPaths = (paths: string[]): ToolInfo[] =>
    paths.flatMap((path) => {
      const tool = toolsByPath.get(path);
      if (tool === undefined) return [];
      return [
        {
          label: getToolLabel(tool),
          url: '/' + tool.path
        }
      ];
    });

  const bookmarkedTools = resolveToolPaths(bookmarkedToolPaths).slice(0, 8);
  const recentTools = resolveToolPaths(recentToolPaths)
    .filter((tool) => !bookmarkedToolPaths.includes(tool.url.substring(1)))
    .slice(0, 8);
  const quickTools =
    bookmarkedTools.length === 0 && recentTools.length === 0
      ? exampleTools
      : [];

  const openTool = (tool: ToolInfo) => {
    const path = tool.url.startsWith('/') ? tool.url.substring(1) : tool.url;
    recordRecentTool(path);
    navigate(tool.url.startsWith('/') ? tool.url : `/${tool.url}`);
  };

  return (
    <Box width={'100%'} maxWidth={1120}>
      <Stack spacing={1.5}>
        <Autocomplete
          autoHighlight
          loading={toolNamespacesLoading}
          onOpen={ensureToolNamespaces}
          options={filteredTools}
          noOptionsText={t('hero.search.noResult')}
          filterOptions={(options) => options}
          groupBy={(option) => option.type}
          renderGroup={(params) => {
            return (
              <li key={params.key}>
                <GroupHeader>
                  {getToolCategoryTitle(params.group, typedT)}
                </GroupHeader>
                <GroupItems>{params.children}</GroupItems>
              </li>
            );
          }}
          inputValue={inputValue}
          getOptionLabel={getToolLabel}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              onFocus={ensureToolNamespaces}
              placeholder={t('hero.search.placeholder')}
              InputProps={{
                ...params.InputProps,
                endAdornment: <SearchIcon />,
                sx: {
                  borderRadius: 1,
                  backgroundColor: 'background.paper'
                }
              }}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...optionProps } = props;
            return (
              <Box
                component="li"
                key={key}
                {...optionProps}
                onClick={() => navigate('/' + option.path)}
              >
                <Stack
                  direction={'row'}
                  alignItems={'center'}
                  justifyContent={'space-between'}
                  width={'100%'}
                >
                  <Stack direction={'row'} spacing={1.5} alignItems={'center'}>
                    <ToolCategoryIcon
                      category={option.type}
                      sx={{ fontSize: 20 }}
                    />
                    <Box>
                      <Typography fontWeight={700}>
                        {getToolLabel(option)}
                      </Typography>
                      <Typography fontSize={12} color={'text.secondary'}>
                        {toolNamespacesLoaded
                          ? typedT(option.shortDescription)
                          : option.path}
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmarked(option.path);
                      setBookmarkedToolPaths(getBookmarkedToolPaths());
                    }}
                  >
                    {isBookmarked(option.path) ? (
                      <BookmarkIcon
                        sx={{ fontSize: 20, color: theme.palette.primary.main }}
                      />
                    ) : (
                      <BookmarkBorderIcon
                        sx={{ fontSize: 20, color: theme.palette.grey[500] }}
                      />
                    )}
                  </IconButton>
                </Stack>
              </Box>
            );
          }}
          onInputChange={handleInputChange}
          onChange={(_event, newValue) => {
            if (newValue) {
              recordRecentTool(newValue.path);
              navigate('/' + newValue.path);
            }
          }}
        />

        <Stack spacing={0.75}>
          <ToolChipRow
            title={t('hero.shortcuts.bookmarked')}
            tools={bookmarkedTools}
            onOpen={openTool}
            onDelete={(tool) => {
              toggleBookmarked(tool.url.substring(1));
              setBookmarkedToolPaths(getBookmarkedToolPaths());
            }}
          />
          <ToolChipRow
            title={t('hero.shortcuts.recent')}
            tools={recentTools}
            onOpen={openTool}
          />
          <ToolChipRow
            title={t('hero.shortcuts.common')}
            tools={quickTools}
            onOpen={openTool}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
