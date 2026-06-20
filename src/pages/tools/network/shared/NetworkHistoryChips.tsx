import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';

type NetworkHistoryEntryLike = {
  createdAt: number;
  label: string;
};

type NetworkHistoryChipsProps<TEntry extends NetworkHistoryEntryLike> = {
  clearLabel: string;
  entries: TEntry[];
  title: string;
  onApply: (entry: TEntry) => void;
  onClear: () => void;
};

export default function NetworkHistoryChips<
  TEntry extends NetworkHistoryEntryLike
>({
  clearLabel,
  entries,
  title,
  onApply,
  onClear
}: NetworkHistoryChipsProps<TEntry>) {
  if (entries.length === 0) return null;

  return (
    <Box>
      <Stack
        direction={'row'}
        alignItems={'center'}
        justifyContent={'space-between'}
        gap={1}
        mb={1}
      >
        <Typography fontSize={14} fontWeight={600}>
          {title}
        </Typography>
        <Tooltip title={clearLabel}>
          <IconButton size={'small'} aria-label={clearLabel} onClick={onClear}>
            <DeleteSweepOutlinedIcon fontSize={'small'} />
          </IconButton>
        </Tooltip>
      </Stack>
      <Stack direction={'row'} gap={1} flexWrap={'wrap'} useFlexGap>
        {entries.map((entry) => (
          <Chip
            key={`${entry.createdAt}-${entry.label}`}
            label={entry.label}
            size={'small'}
            onClick={() => onApply(entry)}
            sx={{
              maxWidth: { xs: '100%', sm: 320 },
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
