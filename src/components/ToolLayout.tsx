import { Box } from '@mui/material';
import React, { ReactNode, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import ToolHeader from './ToolHeader';
import { getI18nNamespaceFromToolCategory } from '../utils/string';
import { useTranslation } from 'react-i18next';
import { ToolCategory } from '@tools/defineTool';
import { FullI18nKey } from '../i18n';
import { recordRecentTool } from '@utils/recentTools';

export default function ToolLayout({
  children,
  i18n,
  type,
  fullPath
}: {
  type: ToolCategory;
  fullPath: string;
  children: ReactNode;
  i18n?: {
    name: FullI18nKey;
    description: FullI18nKey;
    shortDescription: FullI18nKey;
  };
}) {
  const { t } = useTranslation([
    'translation',
    getI18nNamespaceFromToolCategory(type)
  ]);

  useEffect(() => {
    recordRecentTool(fullPath);
  }, [fullPath]);

  // Use i18n keys if available, otherwise fall back to provided strings
  //@ts-ignore
  const toolTitle: string = t(i18n.name);

  return (
    <Box
      width={'100%'}
      display={'flex'}
      flexDirection={'column'}
      alignItems={'center'}
      sx={{ backgroundColor: 'background.default' }}
    >
      <Helmet>
        <title>{`${toolTitle} - Private Toolbox`}</title>
      </Helmet>
      <Box
        sx={{
          width: { xs: 'calc(100% - 24px)', md: '85%' },
          maxWidth: 1440
        }}
      >
        <ToolHeader title={toolTitle} type={type} path={fullPath} />
        {children}
      </Box>
    </Box>
  );
}
