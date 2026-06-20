import {
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import type { ReactNode } from 'react';

export function CompactTextField({
  label,
  value,
  onChange,
  type = 'text'
}: {
  label: string;
  value: string;
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
    />
  );
}

export function CompactCheckbox({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <FormControlLabel
      sx={{ m: 0 }}
      control={
        <Checkbox
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          size="small"
        />
      }
      label={label}
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

export function CompactToggle<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={value}
      onChange={(_, nextValue: T | null) => {
        if (nextValue) onChange(nextValue);
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export function OptionStack({ children }: { children: ReactNode }) {
  return <Stack spacing={1.5}>{children}</Stack>;
}
