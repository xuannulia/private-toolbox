import { Box, Stack, Typography } from '@mui/material';

interface ExampleProps {
  title: string;
  description: string;
}

export default function ToolInfo({ title, description }: ExampleProps) {
  return (
    <Stack direction={'row'} alignItems={'center'} spacing={2}>
      <Box>
        <Typography mb={1} fontSize={18} fontWeight={600} color={'primary'}>
          {title}
        </Typography>
        <Typography fontSize={15} color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}
