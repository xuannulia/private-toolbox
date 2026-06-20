import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  Button,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Tooltip
} from '@mui/material';
import { useState } from 'react';

type NetworkActionBarProps = {
  apiBaseUrl: string;
  apiBaseUrlLabel: string;
  loading: boolean;
  runLabel: string;
  onApiBaseUrlChange: (value: string) => void;
  onRun: () => void;
};

export default function NetworkActionBar({
  apiBaseUrl,
  apiBaseUrlLabel,
  loading,
  runLabel,
  onApiBaseUrlChange,
  onRun
}: NetworkActionBarProps) {
  const [apiOpen, setApiOpen] = useState(false);

  return (
    <Stack spacing={1}>
      <Stack direction={'row'} spacing={1} alignItems={'center'}>
        <Button
          variant={'contained'}
          startIcon={<SearchIcon />}
          onClick={onRun}
          disabled={loading}
          sx={{ alignSelf: 'flex-start' }}
        >
          {runLabel}
        </Button>
        <Tooltip title={apiBaseUrlLabel}>
          <IconButton
            aria-label={apiBaseUrlLabel}
            size={'small'}
            onClick={() => setApiOpen((current) => !current)}
          >
            <SettingsOutlinedIcon fontSize={'small'} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Collapse in={apiOpen} unmountOnExit>
        <TextField
          fullWidth
          size={'small'}
          label={apiBaseUrlLabel}
          value={apiBaseUrl}
          onChange={(event) => onApiBaseUrlChange(event.target.value)}
          sx={{ backgroundColor: 'background.paper' }}
        />
      </Collapse>
    </Stack>
  );
}
