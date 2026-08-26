import { Button, Box, Icon } from '@inithium/ui';

export function App() {
  return (
    <Box flex={{direction: 'row', align: 'center', gap: 16}} padding={{base: 16}} margin={{top: 15}}>
      {/* Red square, black smiley - textColor paints the glyph itself, bgColor the wrapper box */}
      <Icon name="Smiley" size={32} bgColor={{color: 'red', intensity: 500}} textColor={{color: 'slate', intensity: 950}} padding={{base: 8}} />

      {/* textColor only - no bgColor means no background is imparted */}
      <Icon name="Smiley" size={32} textColor={{color: 'primary', intensity: 500}} />

      <Button
        variant={{kind: 'filled', color: 'primary', intensity: 500}}
        entryAdornment={<Icon name="House" textColor={{color: 'primary-foreground', intensity: 500}} />}
      >
        Go home
      </Button>

      <Button
        variant={{kind: 'outlined', color: 'secondary', intensity: 500}}
        exitAdornment={<Icon name="ArrowRight" textColor={{color: 'secondary', intensity: 500}} />}
      >
        Continue
      </Button>

      <Button
        variant={{kind: 'ghost', color: 'accent', intensity: 500}}
        entryAdornment={<Icon name="Download" textColor={{color: 'accent', intensity: 500}} />}
        exitAdornment={<Icon name="CaretDown" textColor={{color: 'accent', intensity: 500}} />}
      >
        Export
      </Button>
    </Box>
  );
}

export default App;
