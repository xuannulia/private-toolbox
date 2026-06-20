import { Box, Stack, TextField, useTheme } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useNavigate, useParams } from 'react-router-dom';
import { filterTools, getToolsByCategory } from '../../tools';
import { getToolCategoryTitle } from '@utils/string';
import { Icon } from '@iconify/react';
import React from 'react';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { Helmet } from 'react-helmet';
import UserTypeFilter from '@components/UserTypeFilter';
import { useTranslation } from 'react-i18next';
import { validNamespaces } from '../../i18n';
import { useUserTypeFilter } from '../../providers/UserTypeFilterProvider';

export default function ToolsByCategory() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { categoryName } = useParams();
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const { selectedUserTypes, setSelectedUserTypes } = useUserTypeFilter();
  const { t } = useTranslation(validNamespaces);
  const rawTitle = getToolCategoryTitle(categoryName as string, t);
  // First get tools by category without filtering
  const toolsByCategory = getToolsByCategory(selectedUserTypes, t).find(
    ({ type }) => type === categoryName
  );
  const categoryDefinedTools = toolsByCategory?.tools ?? [];

  const categoryTools = filterTools(
    categoryDefinedTools,
    searchTerm,
    selectedUserTypes,
    t
  );

  return (
    <Box
      sx={{
        backgroundColor: 'background.default',
        minHeight: '100%'
      }}
    >
      <Helmet>
        <title>{rawTitle}</title>
      </Helmet>
      <Box
        width={'100%'}
        maxWidth={1120}
        mx={'auto'}
        px={{ xs: 1.5, md: 3 }}
        py={{ xs: 2, md: 3 }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent={'space-between'}
            alignItems={{ xs: 'stretch', md: 'center' }}
            spacing={1.5}
          >
            <Stack direction={'row'} alignItems={'center'} spacing={1}>
              <IconButton onClick={() => navigate('/')} size={'small'}>
                <ArrowBackIcon color={'primary'} />
              </IconButton>
              <Typography
                component={'h1'}
                fontSize={{ xs: 20, md: 22 }}
                fontWeight={700}
              >
                {rawTitle}
              </Typography>
            </Stack>
            <TextField
              size={'small'}
              placeholder={t('translation:hero.search.placeholder')}
              aria-label={t('translation:hero.search.placeholder')}
              InputProps={{
                endAdornment: <SearchIcon />,
                sx: {
                  borderRadius: 1,
                  backgroundColor: 'background.paper'
                }
              }}
              sx={{ width: { xs: '100%', md: 360 } }}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </Stack>
          <Box display={'flex'} justifyContent={'center'}>
            <UserTypeFilter
              userTypes={toolsByCategory?.userTypes ?? undefined}
              selectedUserTypes={selectedUserTypes}
              onUserTypesChange={setSelectedUserTypes}
            />
          </Box>
          {categoryTools.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))'
                },
                gap: 1.5
              }}
            >
              {categoryTools.map((tool) => (
                <Stack
                  key={tool.path}
                  data-tool-path={tool.path}
                  sx={{
                    backgroundColor: 'background.paper',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    cursor: 'pointer',
                    height: '100%',
                    p: 2,
                    transition:
                      'border-color 120ms ease, background 120ms ease',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      backgroundColor: theme.palette.background.hover
                    }
                  }}
                  onClick={() => navigate('/' + tool.path)}
                  direction={'row'}
                  alignItems={'flex-start'}
                  spacing={1.5}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      color: 'primary.main',
                      backgroundColor: 'background.default',
                      flexShrink: 0
                    }}
                  >
                    <Icon
                      icon={tool.icon ?? 'ph:compass-tool-thin'}
                      fontSize={22}
                    />
                  </Box>
                  <Box minWidth={0}>
                    <Typography fontWeight={700}>{t(tool.name)}</Typography>
                    <Typography
                      color={'text.secondary'}
                      fontSize={13}
                      mt={0.5}
                    >
                      {t(tool.shortDescription)}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Box>
          ) : (
            <Typography color={'text.secondary'} fontSize={14}>
              {t('translation:hero.search.noResult')}
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
