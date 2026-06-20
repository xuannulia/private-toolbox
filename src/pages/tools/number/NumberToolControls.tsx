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
import { replaceSpecialCharacters } from '@utils/string';

export const normalizeNumberToken = (value: string): string =>
  replaceSpecialCharacters(value);

export function NumberOptionStack({ children }: { children: ReactNode }) {
  return <Stack spacing={1.5}>{children}</Stack>;
}

export function CompactNumberField({
  label,
  value,
  onChange,
  type = 'number',
  placeholder
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <TextField
      fullWidth
      label={label}
      placeholder={placeholder}
      size="small"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ backgroundColor: 'background.paper' }}
    />
  );
}

export function CompactNumberCheckbox({
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

export function CompactNumberSelect<T extends string>({
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

export function CompactNumberToggle<T extends string>({
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
