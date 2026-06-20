import { MenuItem, Slider, Stack, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function ConverterOptionStack({ children }: { children: ReactNode }) {
  return <Stack spacing={2}>{children}</Stack>;
}

export function QualitySlider({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" color="text.secondary">
        {label} {value}%
      </Typography>
      <Slider
        min={1}
        max={100}
        step={1}
        value={value}
        valueLabelDisplay="auto"
        valueLabelFormat={(nextValue) => `${nextValue}%`}
        onChange={(_, nextValue) =>
          onChange(Array.isArray(nextValue) ? nextValue[0] : nextValue)
        }
      />
    </Stack>
  );
}

export function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextField
      fullWidth
      label={label}
      size="small"
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function CompactSelect<T extends string>({
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
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
