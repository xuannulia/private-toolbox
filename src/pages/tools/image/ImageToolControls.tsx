import {
  Checkbox,
  FormControlLabel,
  MenuItem,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import type { ReactNode } from 'react';

export function ImageOptionStack({ children }: { children: ReactNode }) {
  return <Stack spacing={1.5}>{children}</Stack>;
}

export function CompactImageField({
  label,
  value,
  onChange,
  type = 'number',
  disabled = false,
  multiline = false,
  rows,
  placeholder
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <TextField
      fullWidth
      disabled={disabled}
      label={label}
      multiline={multiline}
      placeholder={placeholder}
      rows={rows}
      size="small"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ backgroundColor: 'background.paper' }}
    />
  );
}

export function CompactImageCheckbox({
  checked,
  disabled = false,
  label,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <FormControlLabel
      sx={{ m: 0 }}
      control={
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          size="small"
        />
      }
      label={label}
    />
  );
}

export function CompactImageSelect<T extends string>({
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

export function CompactImageToggle<T extends string | number>({
  label,
  value,
  options,
  onChange
}: {
  label?: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <Stack spacing={0.75}>
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value}
        onChange={(_, nextValue: T | null) => {
          if (nextValue !== null) onChange(nextValue);
        }}
      >
        {options.map((option) => (
          <ToggleButton key={option.value} value={option.value}>
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}

export function ImageSlider({
  label,
  value,
  min,
  max,
  step = 1,
  valueSuffix = '',
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueSuffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" color="text.secondary">
        {label} {value}
        {valueSuffix}
      </Typography>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        valueLabelDisplay="auto"
        valueLabelFormat={(nextValue) => `${nextValue}${valueSuffix}`}
        onChange={(_, nextValue) =>
          onChange(Array.isArray(nextValue) ? nextValue[0] : nextValue)
        }
      />
    </Stack>
  );
}

export function ImageStatList({
  rows
}: {
  rows: { label: string; value: string | number | null }[];
}) {
  const visibleRows = rows.filter((row) => row.value !== null);

  if (!visibleRows.length) return null;

  return (
    <Stack spacing={0.75}>
      {visibleRows.map((row) => (
        <Typography key={row.label} variant="body2" color="text.secondary">
          {row.label}: {row.value}
        </Typography>
      ))}
    </Stack>
  );
}
