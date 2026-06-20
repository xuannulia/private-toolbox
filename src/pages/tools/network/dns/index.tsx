import { ToolComponentProps } from '@tools/defineTool';
import { useTranslation } from 'react-i18next';
import NetworkLookupTool from '../shared/NetworkLookupTool';

const recordTypes = ['A', 'AAAA', 'CAA', 'CNAME', 'MX', 'NS', 'SOA', 'SRV', 'TXT', 'ANY'];

export default function DnsLookup(props: ToolComponentProps) {
  const { t } = useTranslation('network');

  return (
    <NetworkLookupTool
      {...props}
      toolName={'dns.lookup'}
      fields={[
        {
          name: 'name',
          label: t('dns.name'),
          placeholder: t('dns.namePlaceholder')
        },
        {
          name: 'type',
          label: t('dns.type'),
          type: 'select',
          defaultValue: 'A',
          options: recordTypes.map((type) => ({ label: type, value: type }))
        }
      ]}
    />
  );
}
