import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactSelect,
  CompactTextField,
  OptionStack
} from '../TimeToolControls';
import {
  calculateTimeBetweenDates,
  formatTimeWithLargestUnit,
  getTimeWithTimezone,
  type TimeUnit,
  unitHierarchy
} from './service';

type TimeBetweenState = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  startTimezone: string;
  endTimezone: string;
};

const today = new Date().toISOString().split('T')[0];

const timezoneOptions = [
  { value: 'local', label: 'Local Time' },
  ...Array.from(
    new Map(
      Intl.supportedValuesOf('timeZone').map((tz) => {
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: tz,
          timeZoneName: 'shortOffset'
        });

        const offset =
          formatter
            .formatToParts(new Date())
            .find((part) => part.type === 'timeZoneName')?.value || '';

        const value = offset.replace('UTC', 'GMT');

        return [
          value,
          {
            value,
            label: `${value} (${tz})`
          }
        ];
      })
    ).values()
  ).sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }))
];

const createInitialState = (): TimeBetweenState => ({
  startDate: today,
  startTime: '00:00',
  endDate: today,
  endTime: '12:00',
  startTimezone: 'local',
  endTimezone: 'local'
});

const formatError = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : 'Failed to calculate time difference';

export default function TimeBetweenDates() {
  const { t } = useTranslation('time');
  const [values, setValues] = useState<TimeBetweenState>(createInitialState);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const updateField = (field: keyof TimeBetweenState, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    try {
      const startDateTime = getTimeWithTimezone(
        values.startDate,
        values.startTime,
        values.startTimezone
      );
      const endDateTime = getTimeWithTimezone(
        values.endDate,
        values.endTime,
        values.endTimezone
      );
      const difference = calculateTimeBetweenDates(startDateTime, endDateTime);
      const bestUnit: TimeUnit =
        unitHierarchy.find((unit) => difference[unit] > 0) || 'milliseconds';

      setResult(formatTimeWithLargestUnit(difference, bestUnit));
      setError('');
    } catch (error) {
      setResult('');
      setError(formatError(error));
    }
  }, [values]);

  const output = error ? t('common.errorFallback', { error }) : result;

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <OptionStack>
              <CompactTextField
                label={t('timeBetweenDates.startDate')}
                type="date"
                value={values.startDate}
                onChange={(value) => updateField('startDate', value)}
              />
              <CompactTextField
                label={t('timeBetweenDates.startTime')}
                type="time"
                value={values.startTime}
                onChange={(value) => updateField('startTime', value)}
              />
              <CompactSelect
                label={t('timeBetweenDates.startTimezone')}
                value={values.startTimezone}
                options={timezoneOptions}
                onChange={(value) => updateField('startTimezone', value)}
              />
            </OptionStack>
            <OptionStack>
              <CompactTextField
                label={t('timeBetweenDates.endDate')}
                type="date"
                value={values.endDate}
                onChange={(value) => updateField('endDate', value)}
              />
              <CompactTextField
                label={t('timeBetweenDates.endTime')}
                type="time"
                value={values.endTime}
                onChange={(value) => updateField('endTime', value)}
              />
              <CompactSelect
                label={t('timeBetweenDates.endTimezone')}
                value={values.endTimezone}
                options={timezoneOptions}
                onChange={(value) => updateField('endTimezone', value)}
              />
            </OptionStack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result || Boolean(error)}
            keepSpecialCharacters
            monospace
            title={t('timeBetweenDates.resultTitle')}
            value={output}
          />
        }
      />
    </Box>
  );
}
