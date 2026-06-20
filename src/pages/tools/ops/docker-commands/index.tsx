import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { CustomSnackBarContext } from 'contexts/CustomSnackBarContext';
import { useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type DockerCommandCategory =
  | 'all'
  | 'containers'
  | 'images'
  | 'compose'
  | 'logs'
  | 'network'
  | 'cleanup';

type DockerCommand = {
  id: string;
  category: Exclude<DockerCommandCategory, 'all'>;
  command: string;
  tags: readonly string[];
};

const categories: DockerCommandCategory[] = [
  'all',
  'containers',
  'images',
  'compose',
  'logs',
  'network',
  'cleanup'
];

const commands = [
  {
    id: 'container-list',
    category: 'containers',
    command: 'docker ps -a',
    tags: ['ps', 'container']
  },
  {
    id: 'container-run',
    category: 'containers',
    command: 'docker run --name app -p 8080:80 -d nginx:alpine',
    tags: ['run', 'port', 'daemon']
  },
  {
    id: 'container-shell',
    category: 'containers',
    command: 'docker exec -it app sh',
    tags: ['exec', 'shell']
  },
  {
    id: 'container-stop-remove',
    category: 'containers',
    command: 'docker stop app && docker rm app',
    tags: ['stop', 'rm']
  },
  {
    id: 'image-build',
    category: 'images',
    command: 'docker build -t app:latest .',
    tags: ['build', 'tag']
  },
  {
    id: 'image-list',
    category: 'images',
    command: 'docker images',
    tags: ['image', 'list']
  },
  {
    id: 'image-pull',
    category: 'images',
    command: 'docker pull nginx:alpine',
    tags: ['pull']
  },
  {
    id: 'image-save-load',
    category: 'images',
    command: 'docker save app:latest -o app.tar\n\ndocker load -i app.tar',
    tags: ['save', 'load']
  },
  {
    id: 'compose-up',
    category: 'compose',
    command: 'docker compose up -d',
    tags: ['compose', 'up']
  },
  {
    id: 'compose-build',
    category: 'compose',
    command: 'docker compose up -d --build',
    tags: ['compose', 'build']
  },
  {
    id: 'compose-down',
    category: 'compose',
    command: 'docker compose down --remove-orphans',
    tags: ['compose', 'down']
  },
  {
    id: 'compose-service-shell',
    category: 'compose',
    command: 'docker compose exec app sh',
    tags: ['compose', 'exec']
  },
  {
    id: 'logs-tail',
    category: 'logs',
    command: 'docker logs -f --tail=200 app',
    tags: ['logs', 'tail']
  },
  {
    id: 'stats',
    category: 'logs',
    command: 'docker stats',
    tags: ['stats']
  },
  {
    id: 'inspect',
    category: 'logs',
    command: 'docker inspect app',
    tags: ['inspect']
  },
  {
    id: 'network-list',
    category: 'network',
    command: 'docker network ls',
    tags: ['network']
  },
  {
    id: 'network-create',
    category: 'network',
    command: 'docker network create app-net',
    tags: ['network', 'create']
  },
  {
    id: 'port-list',
    category: 'network',
    command: 'docker port app',
    tags: ['port']
  },
  {
    id: 'cleanup-system',
    category: 'cleanup',
    command: 'docker system prune -f',
    tags: ['prune']
  },
  {
    id: 'cleanup-volumes',
    category: 'cleanup',
    command: 'docker volume prune -f',
    tags: ['volume', 'prune']
  },
  {
    id: 'cleanup-builder',
    category: 'cleanup',
    command: 'docker builder prune -f',
    tags: ['builder', 'prune']
  }
] as const satisfies readonly DockerCommand[];

type DockerCommandId = (typeof commands)[number]['id'];

const commandTitleKey = (id: DockerCommandId) =>
  `dockerCommands.commands.${id}.title` as const;

const commandSummaryKey = (id: DockerCommandId) =>
  `dockerCommands.commands.${id}.summary` as const;

const normalizeSearch = (value: string): string => value.trim().toLowerCase();

export default function DockerCommands() {
  const { t } = useTranslation('ops');
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const [category, setCategory] = useState<DockerCommandCategory>('all');
  const [query, setQuery] = useState('');

  const filteredCommands = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return commands.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        item.command,
        item.tags.join(' '),
        t(commandTitleKey(item.id)),
        t(commandSummaryKey(item.id))
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [category, query, t]);

  const copyCommand = (command: string) => {
    navigator.clipboard
      .writeText(command)
      .then(() => showSnackBar(t('dockerCommands.copied'), 'success'))
      .catch((error) =>
        showSnackBar(t('dockerCommands.copyFailed', { error }), 'error')
      );
  };

  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        size="small"
        value={query}
        label={t('dockerCommands.search')}
        onChange={(event) => setQuery(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          )
        }}
        sx={{ backgroundColor: 'background.paper' }}
      />
      <Tabs
        value={category}
        onChange={(_, value: DockerCommandCategory) => setCategory(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
      >
        {categories.map((item) => (
          <Tab
            key={item}
            value={item}
            label={t(`dockerCommands.categories.${item}`)}
          />
        ))}
      </Tabs>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, minmax(0, 1fr))'
          },
          gap: 1.5
        }}
      >
        {filteredCommands.map((item) => (
          <Paper
            key={item.id}
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.25,
              minWidth: 0
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2">
                  {t(commandTitleKey(item.id))}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25 }}
                >
                  {t(commandSummaryKey(item.id))}
                </Typography>
              </Box>
              <Tooltip title={t('dockerCommands.copy')}>
                <IconButton
                  size="small"
                  onClick={() => copyCommand(item.command)}
                  aria-label={t('dockerCommands.copy')}
                >
                  <ContentCopyRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1,
                borderRadius: 1,
                backgroundColor: 'action.hover',
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.55,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {item.command}
            </Box>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {item.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22 }}
                />
              ))}
            </Stack>
          </Paper>
        ))}
      </Box>
      {filteredCommands.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          {t('dockerCommands.empty')}
        </Typography>
      )}
    </Stack>
  );
}
