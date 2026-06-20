import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import ToolTextResult from '@components/result/ToolTextResult';
import { type JsonValue } from '@private-toolbox/core';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { type NetworkLookupResultState } from '../shared/NetworkLookupTool';

type JsonRecord = Record<string, JsonValue>;

type DetailRowProps = {
  label: string;
  children: ReactNode;
};

type StatusFlag = {
  label: string;
  active: boolean;
};

const isRecord = (value: JsonValue | undefined): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringValue = (
  record: JsonRecord | undefined,
  key: string
): string | null => {
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
};

const booleanValue = (record: JsonRecord | undefined, key: string): boolean =>
  record?.[key] === true;

const joinParts = (parts: Array<string | null | undefined>): string =>
  parts.filter(Boolean).join(', ');

const getNestedRecord = (
  record: JsonRecord | undefined,
  key: string
): JsonRecord | undefined => {
  const value = record?.[key];
  return isRecord(value) ? value : undefined;
};

const getLookupPayload = (value: JsonValue | undefined) => {
  if (!isRecord(value)) return null;

  const dataWrapper = getNestedRecord(value, 'data');
  const data = getNestedRecord(dataWrapper, 'data');
  if (!data) return null;

  return {
    ip: stringValue(data, 'ip') ?? stringValue(value, 'ip') ?? '',
    source: stringValue(value, 'source') ?? '',
    data,
    asn: getNestedRecord(data, 'asn'),
    company: getNestedRecord(data, 'company'),
    privacy: getNestedRecord(data, 'privacy'),
    abuse: getNestedRecord(data, 'abuse')
  };
};

const DetailRow = ({ label, children }: DetailRowProps) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: '120px minmax(0, 1fr)' },
      gap: { xs: 0.5, sm: 1.5 },
      alignItems: 'start',
      py: 0.6
    }}
  >
    <Typography color={'text.secondary'}>{label}</Typography>
    <Box sx={{ minWidth: 0 }}>{children}</Box>
  </Box>
);

const ValueText = ({ children }: { children: ReactNode }) => (
  <Typography
    sx={{
      fontFamily: 'monospace',
      overflowWrap: 'anywhere',
      lineHeight: 1.7
    }}
  >
    {children}
  </Typography>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <Typography fontSize={18} fontWeight={700} sx={{ mt: 1.5, mb: 0.5 }}>
    {children}
  </Typography>
);

export default function IpLookupResultPanel({
  result,
  resultText,
  errorText,
  loading
}: NetworkLookupResultState) {
  const { t } = useTranslation('network');

  if (loading) {
    return (
      <Box>
        <Typography fontSize={20} fontWeight={700} mb={1}>
          {t('common.result')}
        </Typography>
        <Box
          sx={{
            minHeight: 260,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1
          }}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!result || !result.ok) {
    return (
      <Stack spacing={1.5}>
        {errorText && <Alert severity={'error'}>{errorText}</Alert>}
        <ToolTextResult
          title={t('common.result')}
          value={resultText}
          extension={'json'}
          keepSpecialCharacters
        />
      </Stack>
    );
  }

  const payload = getLookupPayload(result.result);
  if (!payload || !payload.ip) {
    return (
      <ToolTextResult
        title={t('common.result')}
        value={resultText}
        extension={'json'}
        keepSpecialCharacters
      />
    );
  }

  const { ip, source, data, asn, company, privacy, abuse } = payload;
  const location = joinParts([
    stringValue(data, 'country'),
    stringValue(data, 'region'),
    stringValue(data, 'city')
  ]);
  const asnLine = [stringValue(asn, 'asn'), stringValue(asn, 'name')]
    .filter(Boolean)
    .join(' - ');
  const companyLine = [
    stringValue(company, 'name'),
    stringValue(company, 'domain')
  ]
    .filter(Boolean)
    .join(' - ');
  const statusFlags: StatusFlag[] = [
    { label: t('ipLookup.panel.vpn'), active: booleanValue(privacy, 'vpn') },
    {
      label: t('ipLookup.panel.proxy'),
      active: booleanValue(privacy, 'proxy')
    },
    { label: t('ipLookup.panel.tor'), active: booleanValue(privacy, 'tor') },
    {
      label: t('ipLookup.panel.relay'),
      active: booleanValue(privacy, 'relay')
    },
    {
      label: t('ipLookup.panel.hosting'),
      active:
        booleanValue(privacy, 'hosting') || booleanValue(data, 'is_hosting')
    },
    {
      label: t('ipLookup.panel.anycast'),
      active: booleanValue(data, 'is_anycast')
    },
    {
      label: t('ipLookup.panel.mobile'),
      active: booleanValue(data, 'is_mobile')
    },
    {
      label: t('ipLookup.panel.anonymous'),
      active:
        booleanValue(data, 'is_anonymous') ||
        Boolean(stringValue(privacy, 'service'))
    },
    {
      label: t('ipLookup.panel.satellite'),
      active: booleanValue(data, 'is_satellite')
    }
  ];
  const activeFlags = statusFlags.filter((item) => item.active);

  return (
    <Box>
      <Typography fontSize={20} fontWeight={700} mb={1}>
        {t('common.result')}
      </Typography>
      <Box
        sx={{
          backgroundColor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          p: { xs: 1.5, sm: 2 },
          minHeight: 360
        }}
      >
        <DetailRow label={'IP'}>
          <Stack direction={'row'} spacing={1} alignItems={'center'}>
            <Typography
              color={'primary.main'}
              sx={{
                fontFamily: 'monospace',
                fontSize: { xs: 24, sm: 30 },
                overflowWrap: 'anywhere'
              }}
            >
              {ip}
            </Typography>
            <Tooltip title={t('ipLookup.panel.copyIp')}>
              <IconButton
                aria-label={t('ipLookup.panel.copyIp')}
                size={'small'}
                onClick={() => navigator.clipboard.writeText(ip)}
              >
                <ContentCopyIcon fontSize={'small'} />
              </IconButton>
            </Tooltip>
          </Stack>
        </DetailRow>

        <Divider sx={{ my: 1.5 }} />

        <SectionTitle>{t('ipLookup.panel.asn')}</SectionTitle>
        {asnLine && (
          <DetailRow label={'ASN'}>
            <ValueText>{asnLine}</ValueText>
          </DetailRow>
        )}
        {stringValue(asn, 'domain') && (
          <DetailRow label={t('ipLookup.panel.asDomain')}>
            <ValueText>{stringValue(asn, 'domain')}</ValueText>
          </DetailRow>
        )}
        {stringValue(asn, 'route') && (
          <DetailRow label={t('ipLookup.panel.route')}>
            <ValueText>{stringValue(asn, 'route')}</ValueText>
          </DetailRow>
        )}
        {stringValue(asn, 'type') && (
          <DetailRow label={t('ipLookup.panel.type')}>
            <ValueText>{stringValue(asn, 'type')}</ValueText>
          </DetailRow>
        )}

        <SectionTitle>{t('ipLookup.panel.location')}</SectionTitle>
        {location && (
          <DetailRow label={'IPInfo.io'}>
            <ValueText>{location}</ValueText>
          </DetailRow>
        )}
        {stringValue(data, 'loc') && (
          <DetailRow label={t('ipLookup.panel.coordinates')}>
            <ValueText>{stringValue(data, 'loc')}</ValueText>
          </DetailRow>
        )}
        {stringValue(data, 'timezone') && (
          <DetailRow label={t('ipLookup.panel.timezone')}>
            <ValueText>{stringValue(data, 'timezone')}</ValueText>
          </DetailRow>
        )}

        {(companyLine || stringValue(data, 'org')) && (
          <>
            <SectionTitle>{t('ipLookup.panel.organization')}</SectionTitle>
            {stringValue(data, 'org') && (
              <DetailRow label={t('ipLookup.panel.org')}>
                <ValueText>{stringValue(data, 'org')}</ValueText>
              </DetailRow>
            )}
            {companyLine && (
              <DetailRow label={t('ipLookup.panel.company')}>
                <ValueText>{companyLine}</ValueText>
              </DetailRow>
            )}
          </>
        )}

        <SectionTitle>{t('ipLookup.panel.attributes')}</SectionTitle>
        <DetailRow label={t('ipLookup.panel.privacy')}>
          <Stack direction={'row'} gap={1} flexWrap={'wrap'} useFlexGap>
            {activeFlags.length > 0 ? (
              activeFlags.map((item) => (
                <Chip
                  key={item.label}
                  color={'warning'}
                  label={item.label}
                  size={'small'}
                />
              ))
            ) : (
              <Chip
                color={'success'}
                label={t('ipLookup.panel.cleanNetwork')}
                size={'small'}
              />
            )}
          </Stack>
        </DetailRow>

        {(stringValue(abuse, 'email') || stringValue(abuse, 'network')) && (
          <>
            <SectionTitle>{t('ipLookup.panel.abuse')}</SectionTitle>
            {stringValue(abuse, 'email') && (
              <DetailRow label={t('ipLookup.panel.email')}>
                <ValueText>{stringValue(abuse, 'email')}</ValueText>
              </DetailRow>
            )}
            {stringValue(abuse, 'network') && (
              <DetailRow label={t('ipLookup.panel.network')}>
                <ValueText>{stringValue(abuse, 'network')}</ValueText>
              </DetailRow>
            )}
          </>
        )}

        {source && (
          <Typography
            color={'text.secondary'}
            sx={{ mt: 2, fontSize: 12, overflowWrap: 'anywhere' }}
          >
            {source}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
