import {
  Box,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import {
  convertCronExpression,
  getCronCalendar,
  getCronNextRuns,
  parseCronExpression,
  type CronCalendarOutput,
  type CronConvertOutput,
  type CronConvertTarget
} from '@private-toolbox/core';
import { ToolComponentProps } from '@tools/defineTool';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatResult = (value: unknown): string => JSON.stringify(value, null, 2);

const currentTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const parseInteger = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
};

const formatRunLabel = (
  iso: string,
  locale: string,
  timezone: string
): string => {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: timezone || undefined
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

function CronCalendarView({
  calendar
}: {
  calendar: CronCalendarOutput | null;
}) {
  const { t } = useTranslation('time');
  if (!calendar) return null;

  const dayLabels =
    calendar.weekStartsOn === 1
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        backgroundColor: 'background.paper'
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Typography fontWeight={700}>
            {calendar.year}-{String(calendar.month).padStart(2, '0')}
          </Typography>
          <Chip
            size="small"
            label={t('crontabGuru.totalRuns', {
              count: calendar.totalRuns
            })}
            variant="outlined"
          />
        </Stack>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: 0.75
          }}
        >
          {dayLabels.map((label) => (
            <Typography
              key={label}
              fontSize={12}
              color="text.secondary"
              textAlign="center"
            >
              {label}
            </Typography>
          ))}
          {calendar.weeks.flatMap((week) =>
            week.days.map((day) => (
              <Box
                key={day.date}
                sx={{
                  minHeight: { xs: 58, sm: 76 },
                  border: 1,
                  borderColor: day.runCount > 0 ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  p: 0.75,
                  opacity: day.inMonth ? 1 : 0.38,
                  backgroundColor:
                    day.runCount > 0 ? 'action.hover' : 'background.default'
                }}
              >
                <Stack spacing={0.5}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={0.5}
                  >
                    <Typography fontSize={12} fontWeight={700}>
                      {day.dayOfMonth}
                    </Typography>
                    {day.runCount > 0 && (
                      <Chip
                        label={day.runCount}
                        size="small"
                        color="primary"
                        sx={{ height: 18, fontSize: 11 }}
                      />
                    )}
                  </Stack>
                  {day.runs.slice(0, 2).map((run) => (
                    <Typography
                      key={run.iso}
                      fontSize={11}
                      color="text.secondary"
                      fontFamily="monospace"
                      noWrap
                    >
                      {run.localTime.slice(0, 5)}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ))
          )}
        </Box>
        {calendar.warnings.map((warning) => (
          <Chip
            key={warning}
            label={warning}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          />
        ))}
      </Stack>
    </Box>
  );
}

export default function CrontabGuru({ title }: ToolComponentProps) {
  const { t, i18n } = useTranslation('time');
  const now = new Date();
  const [expression, setExpression] = useState<string>('0 9 * * 1-5');
  const [timezone, setTimezone] = useState<string>(currentTimezone());
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [targetDialect, setTargetDialect] =
    useState<CronConvertTarget>('quartz');

  const computed = useMemo(() => {
    if (!expression.trim()) {
      return {
        description: '',
        nextRuns: [] as string[],
        calendar: null as CronCalendarOutput | null,
        conversion: null as CronConvertOutput | null,
        json: ''
      };
    }

    try {
      const commonInput = {
        expression,
        timezone: timezone || undefined
      };
      const parsed = parseCronExpression({
        ...commonInput,
        locale: i18n.language
      });

      if (!parsed.valid) {
        throw new Error(parsed.error ?? 'Invalid cron expression');
      }

      const nextRuns = getCronNextRuns({
        ...commonInput,
        count: 5
      });
      const calendar = getCronCalendar({
        ...commonInput,
        year,
        month,
        weekStartsOn: 1,
        maxRunsPerDay: 4
      });
      const conversion = convertCronExpression({
        expression,
        sourceDialect: 'auto',
        targetDialect
      });

      return {
        description: parsed.description ?? '',
        nextRuns: nextRuns.runs.map((run) => run.iso),
        calendar,
        conversion,
        json: formatResult({
          parse: parsed,
          nextRuns,
          calendar,
          conversion
        })
      };
    } catch (error) {
      return {
        description: error instanceof Error ? error.message : 'Cron failed',
        nextRuns: [] as string[],
        calendar: null as CronCalendarOutput | null,
        conversion: null as CronConvertOutput | null,
        json: formatResult({
          error: error instanceof Error ? error.message : 'Cron failed'
        })
      };
    }
  }, [expression, i18n.language, month, targetDialect, timezone, year]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <TextField
              label={t('crontabGuru.expressionTitle')}
              value={expression}
              onChange={(event) => setExpression(event.target.value)}
              placeholder="0 9 * * 1-5"
              fullWidth
            />
            <TextField
              label={t('crontabGuru.timezoneTitle')}
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label={t('crontabGuru.targetDialectTitle')}
              value={targetDialect}
              onChange={(event) =>
                setTargetDialect(event.target.value as CronConvertTarget)
              }
              fullWidth
            >
              <MenuItem value="quartz">
                {t('crontabGuru.targetQuartz')}
              </MenuItem>
              <MenuItem value="crontab">
                {t('crontabGuru.targetCrontab')}
              </MenuItem>
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('crontabGuru.yearTitle')}
                value={year}
                type="number"
                onChange={(event) =>
                  setYear(parseInteger(event.target.value, year))
                }
                fullWidth
              />
              <TextField
                label={t('crontabGuru.monthTitle')}
                value={month}
                type="number"
                onChange={(event) =>
                  setMonth(parseInteger(event.target.value, month))
                }
                fullWidth
              />
            </Stack>
          </Stack>
        }
        result={
          <Stack spacing={2}>
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                backgroundColor: 'background.paper'
              }}
            >
              <Stack spacing={1}>
                <Typography fontWeight={700}>{title}</Typography>
                <Typography color="text.secondary">
                  {computed.description}
                </Typography>
                {computed.nextRuns.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {computed.nextRuns.map((run) => (
                      <Chip
                        key={run}
                        label={formatRunLabel(run, i18n.language, timezone)}
                        size="small"
                      />
                    ))}
                  </Stack>
                )}
                {computed.conversion && (
                  <Stack spacing={1}>
                    <Typography fontSize={12} color="text.secondary">
                      {t('crontabGuru.convertedExpressionTitle')}
                    </Typography>
                    <Typography fontFamily="monospace" fontSize={14}>
                      {computed.conversion.convertedExpression}
                    </Typography>
                    {computed.conversion.warnings.length > 0 && (
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {computed.conversion.warnings.map((warning) => (
                          <Chip
                            key={warning}
                            label={warning}
                            color="warning"
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    )}
                  </Stack>
                )}
              </Stack>
            </Box>
            <CronCalendarView calendar={computed.calendar} />
            <ToolTextResult
              title={t('crontabGuru.resultTitle')}
              value={computed.json}
              extension="json"
              keepSpecialCharacters
            />
          </Stack>
        }
      />
    </Box>
  );
}
