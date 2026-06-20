import { ToolComponentProps } from '@tools/defineTool';
import { useTranslation } from 'react-i18next';
import NetworkLookupTool from '../shared/NetworkLookupTool';

export default function RdapLookup(props: ToolComponentProps) {
  const { t } = useTranslation('network');

  return (
    <NetworkLookupTool
      {...props}
      toolName={'rdap.lookup'}
      fields={[
        {
          name: 'query',
          label: t('rdap.query'),
          placeholder: t('rdap.queryPlaceholder')
        },
        {
          name: 'kind',
          label: t('rdap.kind'),
          type: 'select',
          defaultValue: '',
          omitWhenEmpty: true,
          options: [
            { label: t('rdap.auto'), value: '' },
            { label: t('rdap.domain'), value: 'domain' },
            { label: t('rdap.ip'), value: 'ip' }
          ]
        }
      ]}
    />
  );
}
