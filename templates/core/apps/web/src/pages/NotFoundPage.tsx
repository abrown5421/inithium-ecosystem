import { Box, Button, Text, useNavigateWithTransition } from '@inithium/ui';

export const NotFoundPage = () => {
  const navigate = useNavigateWithTransition();

  return (
  <Box padding={{ base: 16 }} bgColor={{color: 'surface', intensity: 100}} style={{minHeight: 'calc(100vh - 64px)'}} flex={{direction: 'col', justify: 'center', align: 'center'}}>
    <Text as="h1" className="text-3xl font-bold">
      404 — Page not found
    </Text>
    <Text as="p" margin={{base: 16}}>No published page matches this route.</Text>
      <Button variant={{ kind: 'filled', color: 'primary' }} onClick={() => navigate('/')}>
        Go Home
      </Button>
  </Box>
)};

export default NotFoundPage;
