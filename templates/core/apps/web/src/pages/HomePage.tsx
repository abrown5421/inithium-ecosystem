import { Box, Text } from '@inithium/ui';

export const HomePage = () => (
  <Box flex={{ direction: 'col', gap: 12 }} padding={{ base: 32 }}>
    <Text as="h1" className="text-3xl font-bold">
      Welcome to Inithium
    </Text>
    <Text as="p" className="text-base">
      This home page is a real record from the Pages collection, resolved by{' '}
      <code>GET /api/pages/resolve</code> and rendered through <code>PageShell</code>.
    </Text>
  </Box>
);

export default HomePage;
