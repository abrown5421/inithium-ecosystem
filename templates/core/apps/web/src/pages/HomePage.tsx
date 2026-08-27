import { useState } from 'react';
import { Box, ColorPicker, Text } from '@inithium/ui';

export const HomePage = () => {
  const [color, setColor] = useState('#006a8e');

  return (
    <Box flex={{ direction: 'col', gap: 12 }} padding={{ base: 32 }}>
      <Text as="h1" className="text-3xl font-bold">
        Welcome to Inithium
      </Text>
      <Text as="p" className="text-base">
        This home page is a real record from the Pages collection, resolved by{' '}
        <code>GET /api/pages/resolve</code> and rendered through <code>PageShell</code>.
      </Text>

      <Box className="max-w-xs">
        <ColorPicker
          label="ColorPicker demo"
          helperText="Type/paste a hex code, or click the swatch to pick a theme or Tailwind color."
          value={color}
          onValueChange={setColor}
        />
      </Box>
    </Box>
  );
};

export default HomePage;
