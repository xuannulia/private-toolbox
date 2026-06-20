import { getToolsByCategory } from '@tools/index';
import Grid from '@mui/material/Grid';
import { Box, Card, CardActionArea, CardContent, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import ToolCategoryIcon from '@components/ToolCategoryIcon';

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

const SingleCategory = function ({
  category
}: {
  category: ArrayElement<ReturnType<typeof getToolsByCategory>>;
}) {
  const { t } = useTranslation('translation');
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
                  <ToolCategoryIcon
                    category={category.type}
                    sx={{ fontSize: 21 }}
                  />
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
  const { t } = useTranslation('translation');
  const categories = getToolsByCategory([], t);

  return (
    <Stack sx={{ width: '100%', maxWidth: 1120 }} spacing={1.5}>
      <Grid container spacing={1.5}>
        {categories.map((category) => (
          <SingleCategory key={category.type} category={category} />
        ))}
      </Grid>
    </Stack>
  );
}
