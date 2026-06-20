import { Box, Stack } from '@mui/material';
import ToolInputAndResult from '@components/ToolInputAndResult';
import ToolTextInput from '@components/input/ToolTextInput';
import ToolTextResult from '@components/result/ToolTextResult';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CompactCheckbox,
  CompactSelect,
  OptionStack
} from '../TimeToolControls';
import { DiscordTimestampGenerator } from './service';
import { DiscordTimestampFormat } from './types';

export default function DiscordTimestamp() {
  const { t } = useTranslation('time');
  const [input, setInput] = useState('');
  const [format, setFormat] = useState<DiscordTimestampFormat>('F');
  const [enforceUTC, setEnforceUTC] = useState(true);
  const [result, setResult] = useState('');

  useEffect(() => {
    setResult(DiscordTimestampGenerator(input, { format, enforceUTC }));
  }, [enforceUTC, format, input]);

  return (
    <Box>
      <ToolInputAndResult
        input={
          <Stack spacing={2}>
            <ToolTextInput
              value={input}
              title={t('discordTimestamp.inputTitle')}
              onChange={setInput}
            />
            <OptionStack>
              <CompactSelect
                label={t('discordTimestamp.formats.title')}
                value={format}
                options={[
                  {
                    label: t('discordTimestamp.formats.short_time'),
                    value: 't'
                  },
                  {
                    label: t('discordTimestamp.formats.long_time'),
                    value: 'T'
                  },
                  {
                    label: t('discordTimestamp.formats.short_date'),
                    value: 'd'
                  },
                  {
                    label: t('discordTimestamp.formats.long_date'),
                    value: 'D'
                  },
                  {
                    label: t('discordTimestamp.formats.short_datetime'),
                    value: 'f'
                  },
                  {
                    label: t('discordTimestamp.formats.long_datetime'),
                    value: 'F'
                  },
                  {
                    label: t('discordTimestamp.formats.relative'),
                    value: 'R'
                  }
                ]}
                onChange={setFormat}
              />
              <CompactCheckbox
                checked={enforceUTC}
                label={t('discordTimestamp.utc.label')}
                onChange={setEnforceUTC}
              />
            </OptionStack>
          </Stack>
        }
        result={
          <ToolTextResult
            disabled={!result}
            keepSpecialCharacters
            monospace
            title={t('discordTimestamp.outputTitle')}
            value={result}
          />
        }
      />
    </Box>
  );
}
