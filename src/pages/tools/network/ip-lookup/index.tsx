import { ToolComponentProps } from '@tools/defineTool';
import { useTranslation } from 'react-i18next';
import NetworkLookupTool from '../shared/NetworkLookupTool';

export default function IpLookup(props: ToolComponentProps) {
  const { t } = useTranslation('network');

  return (
    <NetworkLookupTool
      {...props}
      toolName={'ip.lookup'}
      fields={[
        {
          name: 'ip',
          label: t('ipLookup.ip'),
          placeholder: t('ipLookup.ipPlaceholder')
        }
      ]}
    />
  );
}
