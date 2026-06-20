import { ToolComponentProps } from '@tools/defineTool';
import { useTranslation } from 'react-i18next';
import NetworkLookupTool from '../shared/NetworkLookupTool';

export default function SslInspect(props: ToolComponentProps) {
  const { t } = useTranslation('network');

  return (
    <NetworkLookupTool
      {...props}
      toolName={'ssl.inspect'}
      fields={[
        {
          name: 'host',
          label: t('ssl.host'),
          placeholder: t('ssl.hostPlaceholder')
        },
        {
          name: 'port',
          label: t('ssl.port'),
          type: 'number',
          defaultValue: '443'
        },
        {
          name: 'serverName',
          label: t('ssl.serverName'),
          placeholder: t('ssl.hostPlaceholder'),
          omitWhenEmpty: true
        }
      ]}
    />
  );
}
