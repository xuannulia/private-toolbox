import { Box } from '@mui/material';
import Hero from 'components/Hero';
import Categories from './Categories';
import { Helmet } from 'react-helmet';

export default function Home() {
  return (
    <Box
      padding={{
        xs: 1.5,
        md: 3
      }}
      sx={{
        backgroundColor: 'background.default',
        minHeight: '100%'
      }}
      display={'flex'}
      flexDirection={'column'}
      alignItems={'center'}
      gap={2}
      width={'100%'}
    >
      <Helmet title={'Private Toolbox'} />
      <Hero />
      <Categories />
    </Box>
  );
}
