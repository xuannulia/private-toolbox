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

export const normalizeCsvToken = (value: string): string =>
  replaceSpecialCharacters(value);

export function CompactTextField({
  label,
  value,
  onChange,
  multiline,
  rows,
  type = 'text'
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: string;
}) {
  return (
    <TextField
      fullWidth
      label={label}
      multiline={multiline}
      rows={rows}
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

export function CsvFormatFields({
  delimiter,
  quote,
  comment,
  labels,
  onDelimiterChange,
  onQuoteChange,
  onCommentChange
}: {
  delimiter: string;
  quote: string;
  comment: string;
  labels: {
    delimiter: string;
    quote: string;
    comment: string;
  };
  onDelimiterChange: (value: string) => void;
  onQuoteChange: (value: string) => void;
  onCommentChange: (value: string) => void;
}) {
  return (
    <OptionStack>
      <CompactTextField
        label={labels.delimiter}
        value={delimiter}
        onChange={onDelimiterChange}
      />
      <CompactTextField
        label={labels.quote}
        value={quote}
        onChange={onQuoteChange}
      />
      <CompactTextField
        label={labels.comment}
        value={comment}
        onChange={onCommentChange}
      />
    </OptionStack>
  );
}
