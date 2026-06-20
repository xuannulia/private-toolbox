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
import { type SyntheticEvent, useMemo, useState } from 'react';
import { type DefinedTool } from '@tools/defineTool';
import { filterTools, tools } from '@tools/index';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { getToolCategoryTitle } from '@utils/string';
import { useTranslation } from 'react-i18next';
import { validNamespaces } from '../i18n';
import {
  getBookmarkedToolPaths,
  isBookmarked,
  toggleBookmarked
} from '@utils/bookmark';
import { getRecentToolPaths, recordRecentTool } from '@utils/recentTools';
import IconButton from '@mui/material/IconButton';
import { useUserTypeFilter } from '../providers/UserTypeFilterProvider';

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
  const { t } = useTranslation(validNamespaces);
  const [inputValue, setInputValue] = useState<string>('');
  const theme = useTheme();
  const { selectedUserTypes } = useUserTypeFilter();
  const [bookmarkedToolPaths, setBookmarkedToolPaths] = useState<string[]>(
    getBookmarkedToolPaths()
  );
  const [recentToolPaths] = useState<string[]>(getRecentToolPaths());
  const navigate = useNavigate();
  const filteredTools = useMemo(
    () => filterTools(tools, inputValue, selectedUserTypes, t),
    [inputValue, selectedUserTypes, t]
  );

  const exampleTools: ToolInfo[] = [
    {
      label: t('json:prettify.title'),
      url: '/json/prettify'
    },
    {
      label: t('string:regexToolkit.title'),
      url: '/string/regex-toolkit'
    },
    {
      label: t('time:crontabGuru.title'),
      url: '/time/crontab-guru'
    },
    {
      label: t('network:dns.title'),
      url: '/network/dns-lookup'
    },
    {
      label: t('network:ipLookup.title'),
      url: '/network/ip-lookup'
    },
    {
      label: t('string:rsaKeyPair.title'),
      url: '/string/rsa-keypair'
    },
    {
      label: t('image:qrCode.title'),
      url: '/image-generic/qr-code'
    },
    {
      label: t('ops:dockerCompose.title'),
      url: '/ops/docker-compose'
    },
    {
      label: t('ops:nginxFormat.title'),
      url: '/ops/nginx-format'
    }
  ];

  const handleInputChange = (_event: SyntheticEvent, newInputValue: string) => {
    setInputValue(newInputValue);
  };

  const toolsMap = new Map<string, ToolInfo>();
  for (const tool of filteredTools) {
    toolsMap.set(tool.path, {
      label: t(tool.name),
      url: '/' + tool.path
    });
  }

  const resolveToolPaths = (paths: string[]): ToolInfo[] =>
    paths.flatMap((path) => {
      const tool = toolsMap.get(path);
      if (tool === undefined) return [];
      return [tool];
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
          options={filteredTools}
          noOptionsText={t('translation:hero.search.noResult')}
          filterOptions={(options) => options}
          groupBy={(option) => option.type}
          renderGroup={(params) => {
            return (
              <li key={params.key}>
                <GroupHeader>
                  {getToolCategoryTitle(params.group, t)}
                </GroupHeader>
                <GroupItems>{params.children}</GroupItems>
              </li>
            );
          }}
          inputValue={inputValue}
          getOptionLabel={(option) => t(option.name)}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              placeholder={t('translation:hero.search.placeholder')}
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
                    <Icon fontSize={20} icon={option.icon} />
                    <Box>
                      <Typography fontWeight={700}>{t(option.name)}</Typography>
                      <Typography fontSize={12} color={'text.secondary'}>
                        {t(option.shortDescription)}
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
                    <Icon
                      fontSize={20}
                      color={
                        isBookmarked(option.path)
                          ? theme.palette.primary.main
                          : theme.palette.grey[500]
                      }
                      icon={
                        isBookmarked(option.path)
                          ? 'mdi:bookmark'
                          : 'mdi:bookmark-plus-outline'
                      }
                    />
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
            title={t('translation:hero.shortcuts.bookmarked')}
            tools={bookmarkedTools}
            onOpen={openTool}
            onDelete={(tool) => {
              toggleBookmarked(tool.url.substring(1));
              setBookmarkedToolPaths(getBookmarkedToolPaths());
            }}
          />
          <ToolChipRow
            title={t('translation:hero.shortcuts.recent')}
            tools={recentTools}
            onOpen={openTool}
          />
          <ToolChipRow
            title={t('translation:hero.shortcuts.common')}
            tools={quickTools}
            onOpen={openTool}
          />
        </Stack>
      </Stack>
    </Box>
  );
}
