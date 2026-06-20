import { getToolsByCategory } from '@tools/index';
import Grid from '@mui/material/Grid';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Collapse,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { getI18nNamespaceFromToolCategory } from '@utils/string';
import { useUserTypeFilter } from '../../providers/UserTypeFilterProvider';
import { useState } from 'react';
import { ToolCategory } from '@tools/defineTool';
import { validNamespaces } from '../../i18n';

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

const secondaryHomeCategoryTypes = new Set<ToolCategory>([
  'pdf',
  'video',
  'audio',
  'png',
  'gif',
  'converters'
]);

const splitHomeCategories = (
  categories: ReturnType<typeof getToolsByCategory>
) => ({
  primary: categories.filter(
    (category) => !secondaryHomeCategoryTypes.has(category.type)
  ),
  secondary: categories.filter((category) =>
    secondaryHomeCategoryTypes.has(category.type)
  )
});

const SingleCategory = function ({
  category
}: {
  category: ArrayElement<ReturnType<typeof getToolsByCategory>>;
}) {
  const { t } = useTranslation(getI18nNamespaceFromToolCategory(category.type));
  const navigate = useNavigate();

  const categoryTitle = t(`categories.${category.type}.title`, category.title);
  const categoryDescription = t(
    `categories.${category.type}.description`,
    category.description
  );

  return (
    <Grid item xs={12} sm={6} lg={3}>
      <Card
        variant={'outlined'}
        sx={{
          height: '100%',
          borderRadius: 1,
          backgroundColor: 'background.paper'
        }}
      >
        <CardActionArea
          onClick={() => navigate('/categories/' + category.type)}
          sx={{ height: '100%', alignItems: 'stretch' }}
        >
          <CardContent sx={{ height: '100%', p: 2 }}>
            <Stack spacing={1.25}>
              <Stack direction={'row'} spacing={1.25} alignItems={'center'}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main',
                    backgroundColor: 'background.default',
                    flexShrink: 0
                  }}
                >
                  <Icon icon={category.icon} fontSize={21} />
                </Box>
                <Typography fontWeight={700} noWrap>
                  {categoryTitle}
                </Typography>
              </Stack>
              <Typography
                color={'text.secondary'}
                fontSize={13}
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {categoryDescription}
              </Typography>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
};

export default function Categories() {
  const { selectedUserTypes } = useUserTypeFilter();
  const { t } = useTranslation(validNamespaces);
  const categories = getToolsByCategory(selectedUserTypes, t);
  const { primary, secondary } = splitHomeCategories(categories);
  const [secondaryVisible, setSecondaryVisible] = useState(false);

  return (
    <Stack sx={{ width: '100%', maxWidth: 1120 }} spacing={1.5}>
      <Grid container spacing={1.5}>
        {primary.map((category) => (
          <SingleCategory key={category.type} category={category} />
        ))}
      </Grid>

      {secondary.length > 0 && (
        <Stack spacing={1}>
          <Box>
            <Button
              size={'small'}
              variant={'text'}
              onClick={() => setSecondaryVisible((visible) => !visible)}
              endIcon={
                <Icon
                  icon={
                    secondaryVisible ? 'mdi:chevron-up' : 'mdi:chevron-down'
                  }
                  fontSize={18}
                />
              }
              sx={{ borderRadius: 1 }}
            >
              {secondaryVisible
                ? t('translation:categories.showLess')
                : t('translation:categories.moreTools')}
            </Button>
          </Box>

          <Collapse in={secondaryVisible} timeout={'auto'} unmountOnExit>
            <Grid container spacing={1.5}>
              {secondary.map((category) => (
                <SingleCategory key={category.type} category={category} />
              ))}
            </Grid>
          </Collapse>
        </Stack>
      )}
    </Stack>
  );
}
