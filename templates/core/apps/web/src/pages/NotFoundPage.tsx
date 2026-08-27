import { Box, Text } from '@inithium/ui';

export const NotFoundPage = () => (
  <Box flex={{ direction: 'col', gap: 8 }} padding={{ base: 32 }}>
    <Text as="h1" className="text-3xl font-bold">
      404 — Page not found
    </Text>
    <Text as="p">No published page matches this route.</Text>
  </Box>
);

export default NotFoundPage;
