import { Box } from '@mui/material';
import { EmbedPDF } from '@simplepdf/react-embed-pdf';

export default function PdfEditor() {
  return (
    <Box sx={{ width: '100%', height: { xs: '70vh', md: '80vh' } }}>
      <EmbedPDF mode="inline" style={{ width: '100%', height: '100%' }} />
    </Box>
  );
}
