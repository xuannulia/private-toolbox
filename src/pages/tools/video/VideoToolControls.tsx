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

export function VideoOptionStack({ children }: { children: ReactNode }) {
  return <Stack spacing={1.5}>{children}</Stack>;
}

export function CompactVideoField({
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

export function CompactVideoCheckbox({
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

export function CompactVideoSelect<T extends string>({
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

export function CompactVideoToggle<T extends string | number>({
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

export function VideoSlider({
  label,
  value,
  min,
  max,
  step = 1,
  valueSuffix = '',
  marks,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  valueSuffix?: string;
  marks?: { value: number; label: string }[];
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
        marks={marks}
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
