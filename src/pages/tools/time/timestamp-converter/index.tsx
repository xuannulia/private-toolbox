import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  convertTimestamp,
  type TimestampUnit
} from '@private-toolbox/core/tools/timestamp';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Mode = 'date-to-timestamp' | 'timestamp-to-date';

const pad = (value: number, length = 2): string =>
  String(value).padStart(length, '0');

const toDateTimeLocal = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;

const formatLocal = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}.${pad(date.getMilliseconds(), 3)}`;

const formatError = (error: unknown): string =>
  JSON.stringify(
    {
      code: 'TIMESTAMP_CONVERT_ERROR',
      message: error instanceof Error ? error.message : 'Timestamp failed'
    },
    null,
    2
  );

export default function TimestampConverter() {
  const { t } = useTranslation('time');
  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<Mode>('timestamp-to-date');
  const [dateInput, setDateInput] = useState(() => toDateTimeLocal(new Date()));
  const [timestampInput, setTimestampInput] = useState(() =>
    String(Date.now())
  );
  const [unit, setUnit] = useState<TimestampUnit>('auto');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const result = useMemo(() => {
    try {
      const converted =
        mode === 'timestamp-to-date'
          ? convertTimestamp({
              value: timestampInput,
              mode: 'unix_to_date',
              unit,
              timezone: 'local'
            })
          : convertTimestamp({
              value: dateInput,
              mode: 'date_to_unix',
              timezone: 'local'
            });

      return [
        `${t('timestampConverter.localTime')}: ${converted.formattedLocal}`,
        `${t('timestampConverter.utcTime')}: ${converted.formattedUtc} UTC`,
        `${t('timestampConverter.iso')}: ${converted.iso}`,
        `${t('timestampConverter.seconds')}: ${converted.unixSeconds}`,
        `${t('timestampConverter.milliseconds')}: ${
          converted.unixMilliseconds
        }`,
        `${t('timestampConverter.detectedUnit')}: ${t(
          `timestampConverter.units.${converted.unit}`
        )}`
      ].join('\n');
    } catch (error) {
      return formatError(error);
    }
  }, [dateInput, mode, t, timestampInput, unit]);

  const useCurrentTime = () => {
    const current = new Date();
    setNow(current);
    setDateInput(toDateTimeLocal(current));
    setTimestampInput(String(current.getTime()));
  };

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label={t('timestampConverter.currentLocalTime')}
                value={formatLocal(now)}
                InputProps={{ readOnly: true }}
                sx={{ backgroundColor: 'background.paper' }}
              />
              <TextField
                fullWidth
                size="small"
                label={t('timestampConverter.currentSeconds')}
                value={Math.floor(now.getTime() / 1000)}
                InputProps={{ readOnly: true }}
                sx={{ backgroundColor: 'background.paper' }}
              />
              <TextField
                fullWidth
                size="small"
                label={t('timestampConverter.currentMilliseconds')}
                value={now.getTime()}
                InputProps={{ readOnly: true }}
                sx={{ backgroundColor: 'background.paper' }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select
                fullWidth
                size="small"
                label={t('timestampConverter.mode')}
                value={mode}
                onChange={(event) => setMode(event.target.value as Mode)}
                sx={{ backgroundColor: 'background.paper' }}
              >
                <MenuItem value="timestamp-to-date">
                  {t('timestampConverter.timestampToDate')}
                </MenuItem>
                <MenuItem value="date-to-timestamp">
                  {t('timestampConverter.dateToTimestamp')}
                </MenuItem>
              </TextField>
              <Button
                startIcon={<AccessTimeIcon />}
                variant="contained"
                onClick={useCurrentTime}
                sx={{ flexShrink: 0 }}
              >
                {t('timestampConverter.useCurrentTime')}
              </Button>
            </Stack>
            {mode === 'timestamp-to-date' ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label={t('timestampConverter.timestampInput')}
                  value={timestampInput}
                  onChange={(event) => setTimestampInput(event.target.value)}
                  sx={{ backgroundColor: 'background.paper' }}
                />
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={t('timestampConverter.unit')}
                  value={unit}
                  onChange={(event) =>
                    setUnit(event.target.value as TimestampUnit)
                  }
                  sx={{ backgroundColor: 'background.paper' }}
                >
                  <MenuItem value="auto">
                    {t('timestampConverter.units.auto')}
                  </MenuItem>
                  <MenuItem value="seconds">
                    {t('timestampConverter.units.seconds')}
                  </MenuItem>
                  <MenuItem value="milliseconds">
                    {t('timestampConverter.units.milliseconds')}
                  </MenuItem>
                </TextField>
              </Stack>
            ) : (
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label={t('timestampConverter.dateInput')}
                value={dateInput}
                onChange={(event) => setDateInput(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ backgroundColor: 'background.paper' }}
              />
            )}
          </Stack>
        }
        result={
          <ToolTextResult
            keepSpecialCharacters
            monospace
            title={t('timestampConverter.resultTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
