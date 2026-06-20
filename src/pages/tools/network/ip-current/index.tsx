import { ToolComponentProps } from '@tools/defineTool';
import { useTranslation } from 'react-i18next';
import NetworkLookupTool from '../shared/NetworkLookupTool';

export default function CurrentIp(props: ToolComponentProps) {
  const { t } = useTranslation('network');

  return (
    <NetworkLookupTool
      {...props}
      toolName={'ip.current'}
      runLabel={t('ipCurrent.runLabel')}
      fields={[]}
    />
  );
}
