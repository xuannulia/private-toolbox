import {
  Box,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  generateDockerfileSnippet,
  type DockerfilePackageManager,
  type DockerfileSnippetKind
} from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatError = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : 'Dockerfile snippet generation failed';

const packageManagersByKind: Partial<
  Record<DockerfileSnippetKind, DockerfilePackageManager[]>
> = {
  node_app: ['npm', 'pnpm', 'yarn'],
  python_app: ['pip', 'poetry']
};

const defaultPackageManagerByKind: Partial<
  Record<DockerfileSnippetKind, DockerfilePackageManager>
> = {
  node_app: 'npm',
  python_app: 'pip'
};

export default function DockerfileSnippet({ title }: ToolComponentProps) {
  const { t } = useTranslation('ops');
  const [kind, setKind] = useState<DockerfileSnippetKind>('node_app');
  const [packageManager, setPackageManager] =
    useState<DockerfilePackageManager>('npm');
  const [baseImage, setBaseImage] = useState('');
  const [runtimeImage, setRuntimeImage] = useState('');
  const [workdir, setWorkdir] = useState('/app');
  const [port, setPort] = useState(3000);
  const [pythonModule, setPythonModule] = useState('app.main:app');
  const [includeHealthcheck, setIncludeHealthcheck] = useState(false);
  const [useNonRootUser, setUseNonRootUser] = useState(true);
  const [output, setOutput] = useState('');
  const [dockerignore, setDockerignore] = useState('');

  const packageManagers = useMemo(
    () => packageManagersByKind[kind] ?? [],
    [kind]
  );

  useEffect(() => {
    const defaultPackageManager = defaultPackageManagerByKind[kind];
    if (
      defaultPackageManager &&
      !packageManagersByKind[kind]?.includes(packageManager)
    ) {
      setPackageManager(defaultPackageManager);
    }
  }, [kind, packageManager]);

  useEffect(() => {
    try {
      const result = generateDockerfileSnippet({
        kind,
        packageManager,
        baseImage,
        runtimeImage,
        workdir,
        port,
        pythonModule,
        includeHealthcheck,
        useNonRootUser
      });
      setOutput(result.output);
      setDockerignore(result.dockerignore.join('\n'));
    } catch (error) {
      setOutput(formatError(error));
      setDockerignore('');
    }
  }, [
    baseImage,
    includeHealthcheck,
    kind,
    packageManager,
    port,
    pythonModule,
    runtimeImage,
    useNonRootUser,
    workdir
  ]);

  const showPackageManager = packageManagers.length > 0;
  const showRuntimeImage =
    kind === 'node_app' || kind === 'go_app' || kind === 'static_nginx';
  const showPort = kind !== 'static_nginx';
  const showPythonModule = kind === 'python_app';
  const showNonRoot = kind !== 'static_nginx';
  const showHealthcheck = kind !== 'static_nginx';

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label={t('dockerfileSnippet.kind')}
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as DockerfileSnippetKind)
              }
              sx={{ backgroundColor: 'background.paper' }}
            >
              <MenuItem value="node_app">
                {t('dockerfileSnippet.kinds.nodeApp')}
              </MenuItem>
              <MenuItem value="python_app">
                {t('dockerfileSnippet.kinds.pythonApp')}
              </MenuItem>
              <MenuItem value="go_app">
                {t('dockerfileSnippet.kinds.goApp')}
              </MenuItem>
              <MenuItem value="static_nginx">
                {t('dockerfileSnippet.kinds.staticNginx')}
              </MenuItem>
            </TextField>
            {showPackageManager && (
              <TextField
                select
                fullWidth
                size="small"
                label={t('dockerfileSnippet.packageManager')}
                value={packageManager}
                onChange={(event) =>
                  setPackageManager(
                    event.target.value as DockerfilePackageManager
                  )
                }
                sx={{ backgroundColor: 'background.paper' }}
              >
                {packageManagers.map((item) => (
                  <MenuItem key={item} value={item}>
                    {t(`dockerfileSnippet.packageManagers.${item}`)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              fullWidth
              size="small"
              label={t('dockerfileSnippet.baseImage')}
              value={baseImage}
              placeholder={t(`dockerfileSnippet.defaults.${kind}.baseImage`)}
              onChange={(event) => setBaseImage(event.target.value)}
              sx={{ backgroundColor: 'background.paper' }}
            />
            {showRuntimeImage && (
              <TextField
                fullWidth
                size="small"
                label={t('dockerfileSnippet.runtimeImage')}
                value={runtimeImage}
                placeholder={t(
                  `dockerfileSnippet.defaults.${kind}.runtimeImage`
                )}
                onChange={(event) => setRuntimeImage(event.target.value)}
                sx={{ backgroundColor: 'background.paper' }}
              />
            )}
            {kind !== 'static_nginx' && (
              <TextField
                fullWidth
                size="small"
                label={t('dockerfileSnippet.workdir')}
                value={workdir}
                onChange={(event) => setWorkdir(event.target.value)}
                sx={{ backgroundColor: 'background.paper' }}
              />
            )}
            {showPort && (
              <TextField
                fullWidth
                size="small"
                type="number"
                label={t('dockerfileSnippet.port')}
                value={port}
                onChange={(event) => setPort(Number(event.target.value))}
                inputProps={{ min: 1, max: 65535 }}
                sx={{ backgroundColor: 'background.paper' }}
              />
            )}
            {showPythonModule && (
              <TextField
                fullWidth
                size="small"
                label={t('dockerfileSnippet.pythonModule')}
                value={pythonModule}
                onChange={(event) => setPythonModule(event.target.value)}
                sx={{ backgroundColor: 'background.paper' }}
              />
            )}
            <Stack spacing={1}>
              {showHealthcheck && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeHealthcheck}
                      onChange={(event) =>
                        setIncludeHealthcheck(event.target.checked)
                      }
                    />
                  }
                  label={t('dockerfileSnippet.healthcheck')}
                />
              )}
              {showNonRoot && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useNonRootUser}
                      onChange={(event) =>
                        setUseNonRootUser(event.target.checked)
                      }
                    />
                  }
                  label={t('dockerfileSnippet.nonRoot')}
                />
              )}
            </Stack>
          </Stack>
        }
        result={
          <Stack spacing={2}>
            <ToolTextResult
              title={t('dockerfileSnippet.resultTitle')}
              value={output}
              extension={'dockerfile'}
              keepSpecialCharacters
              monospace
            />
            <ToolTextResult
              title={t('dockerfileSnippet.dockerignoreTitle')}
              value={dockerignore}
              extension={'dockerignore'}
              keepSpecialCharacters
              monospace
            />
          </Stack>
        }
      />
    </Box>
  );
}
