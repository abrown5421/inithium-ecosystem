import { AnimateBox, Box, Text } from '@inithium/ui';

export function App() {
  return (
    <>
      <AnimateBox animation={{entrance: 'animate__fadeInUp', exit: 'animate__fadeOutDown'}} margin={{base:5, top:15}}>
        <Text bgColor={{color: 'primary', intensity: 500}} textColor={{color: 'primary-foreground', intensity: 500}} padding={{base:5}}>primary</Text>
      </AnimateBox>

      {/* Box: plain flex container, no animation - row layout with spaced-out children */}
      <Box
        flex={{direction: 'row', justify: 'between', align: 'center', gap: 16}}
        bgColor={{color: 'emerald', intensity: 200}}
        padding={{base: 16}}
        margin={{top: 15}}
      >
        <Text bgColor={{color: 'secondary', intensity: 500}} textColor={{color: 'secondary-foreground', intensity: 500}} padding={{base:5}}>secondary</Text>
        <Text bgColor={{color: 'accent', intensity: 500}} textColor={{color: 'accent-foreground', intensity: 500}} padding={{base:5}}>accent</Text>
        <Text bgColor={{color: 'surface', intensity: 500}} textColor={{color: 'surface-foreground', intensity: 500}} padding={{base:5}}>surface</Text>
      </Box>

      {/* AnimateBox: flex + animation together - column layout that fades/slides in */}
      <AnimateBox
        flex={{direction: 'col', align: 'center', gap: 8}}
        animation={{entrance: 'animate__zoomIn', speed: 'animate__faster'}}
        bgColor={{color: 'surface', intensity: 200}}
        padding={{base: 16}}
        margin={{top: 15}}
      >
        <Text bgColor={{color: 'primary', intensity: 500}} textColor={{color: 'primary-foreground', intensity: 500}} padding={{base:5}}>stacked</Text>
        <Text bgColor={{color: 'secondary', intensity: 500}} textColor={{color: 'secondary-foreground', intensity: 500}} padding={{base:5}}>vertically</Text>
      </AnimateBox>
    </>
  );
}

export default App;
