import {
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { replaceSpecialCharacters } from '@utils/string';

export type ListSplitMode = 'symbol' | 'regex';

export const normalizeListSeparator = (value: string): string =>
  replaceSpecialCharacters(value);

export function SplitModeToggle({
  value,
  onChange,
  symbolLabel,
  regexLabel
}: {
  value: ListSplitMode;
  onChange: (value: ListSplitMode) => void;
  symbolLabel: string;
  regexLabel: string;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={value}
      onChange={(_, nextValue: ListSplitMode | null) => {
        if (nextValue) onChange(nextValue);
      }}
    >
      <ToggleButton value="symbol">{symbolLabel}</ToggleButton>
      <ToggleButton value="regex">{regexLabel}</ToggleButton>
    </ToggleButtonGroup>
  );
}

export function CompactTextField({
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

export function SplitOptions({
  splitMode,
  splitSeparator,
  joinSeparator,
  labels,
  onSplitModeChange,
  onSplitSeparatorChange,
  onJoinSeparatorChange
}: {
  splitMode: ListSplitMode;
  splitSeparator: string;
  joinSeparator?: string;
  labels: {
    symbol: string;
    regex: string;
    splitSeparator: string;
    joinSeparator: string;
  };
  onSplitModeChange: (value: ListSplitMode) => void;
  onSplitSeparatorChange: (value: string) => void;
  onJoinSeparatorChange?: (value: string) => void;
}) {
  return (
    <Stack spacing={1.5}>
      <SplitModeToggle
        value={splitMode}
        onChange={onSplitModeChange}
        symbolLabel={labels.symbol}
        regexLabel={labels.regex}
      />
      <CompactTextField
        label={labels.splitSeparator}
        value={splitSeparator}
        onChange={onSplitSeparatorChange}
      />
      {joinSeparator !== undefined && onJoinSeparatorChange && (
        <CompactTextField
          label={labels.joinSeparator}
          value={joinSeparator}
          onChange={onJoinSeparatorChange}
        />
      )}
    </Stack>
  );
}
