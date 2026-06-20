import { Box, Stack, useTheme } from '@mui/material';
import Typography from '@mui/material/Typography';
import ToolBreadcrumb from './ToolBreadcrumb';
import { Icon } from '@iconify/react';
import { getToolsByCategory } from '@tools/index';
import { useState } from 'react';
import { isBookmarked, toggleBookmarked } from '@utils/bookmark';
import IconButton from '@mui/material/IconButton';
import { useTranslation } from 'react-i18next';

interface ToolHeaderProps {
  title: string;
  type: string;
  path: string;
}

export default function ToolHeader({ title, type, path }: ToolHeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [bookmarked, setBookmarked] = useState<boolean>(isBookmarked(path));
  return (
    <Box
      component="header"
      sx={{
        width: '100%',
        mt: { xs: 2, md: 3 },
        mb: { xs: 2, md: 3 }
      }}
    >
      <ToolBreadcrumb
        items={[
          { title: t('toolLayout.allTools'), link: '/' },
          {
            title: getToolsByCategory([], t).find(
              (category) => category.type === type
            )!.rawTitle,
            link: '/categories/' + type
          },
          { title }
        ]}
      />
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        mt={1}
      >
        <Typography
          component="h1"
          sx={{
            color: 'primary.main',
            fontSize: { xs: 24, md: 30 },
            fontWeight: 600,
            lineHeight: 1.2
          }}
        >
          {title}
        </Typography>
        <IconButton
          aria-label={
            bookmarked
              ? t('toolLayout.removeBookmark')
              : t('toolLayout.addBookmark')
          }
          onClick={() => {
            toggleBookmarked(path);
            setBookmarked(!bookmarked);
          }}
        >
          <Icon
            fontSize={28}
            color={
              bookmarked ? theme.palette.primary.main : theme.palette.grey[500]
            }
            icon={bookmarked ? 'mdi:bookmark' : 'mdi:bookmark-plus-outline'}
          />
        </IconButton>
      </Stack>
    </Box>
  );
}
