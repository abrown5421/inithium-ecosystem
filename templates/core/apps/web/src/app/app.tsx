import { Box, AlertContainer, DialogContainer, DrawerContainer, Button, Text, useDrawer } from '@inithium/ui';

export function App() {
  const drawer = useDrawer();
  const handleOpenDrawer = () => {
    drawer.show(<Text>This is the drawer content.</Text>, {
      title: 'Drawer title',
      description: 'Opened from the app root via drawer.show().',
    });
  };

  return (
    <>
      <Box
        flex={{direction: 'row', justify: 'between', align: 'center', gap: 5}}
        bgColor={{color: 'surface', intensity: 100}}
        borderColor={{color: 'surface', intensity: 500}}
        padding={{base: 16}}
        className='w-full h-full'
      >
        <Button variant={{ kind: 'filled', color: 'primary', intensity: 500 }} onClick={handleOpenDrawer}>
          Click Me
        </Button>
      </Box>
      <AlertContainer />
      <DialogContainer />
      <DrawerContainer />
    </>
  );
}

export default App;
