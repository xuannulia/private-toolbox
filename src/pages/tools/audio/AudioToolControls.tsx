import { MenuItem, Stack, TextField } from '@mui/material';
import type { ReactNode } from 'react';

export type AudioOutputFormat = 'mp3' | 'aac' | 'wav';

export const AUDIO_FORMAT_OPTIONS: {
  label: string;
  value: AudioOutputFormat;
}[] = [
  { label: 'MP3', value: 'mp3' },
  { label: 'AAC', value: 'aac' },
  { label: 'WAV', value: 'wav' }
];

export function AudioOptionStack({ children }: { children: ReactNode }) {
  return <Stack spacing={1.5}>{children}</Stack>;
}

export function CompactAudioField({
  label,
  value,
  onChange,
  type = 'text'
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <TextField
      fullWidth
      label={label}
      size="small"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ backgroundColor: 'background.paper' }}
    />
  );
}

export function CompactAudioSelect<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <TextField
      fullWidth
      label={label}
      select
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      sx={{ backgroundColor: 'background.paper' }}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
