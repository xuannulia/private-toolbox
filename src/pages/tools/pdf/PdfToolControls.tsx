import {
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import type { ReactNode } from 'react';

export function PdfOptionStack({ children }: { children: ReactNode }) {
  return <Stack spacing={1.5}>{children}</Stack>;
}

export function CompactPdfField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
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

export function CompactPdfSwitch({
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
        <Switch
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          size="small"
        />
      }
      label={label}
    />
  );
}

export function CompactPdfToggle<T extends string | number>({
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

export function PdfSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="body2" color="text.secondary">
        {label} {value}%
      </Typography>
      <Slider
        min={min}
        max={max}
        step={step}
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

export function PdfStatList({
  items
}: {
  items: { label: string; value: string | number | null | undefined }[];
}) {
  const visibleItems = items.filter(
    (item) =>
      item.value !== null && item.value !== undefined && item.value !== ''
  );

  if (!visibleItems.length) return null;

  return (
    <Stack spacing={0.5}>
      {visibleItems.map((item) => (
        <Typography key={item.label} variant="body2" color="text.secondary">
          {item.label}: <strong>{item.value}</strong>
        </Typography>
      ))}
    </Stack>
  );
}
