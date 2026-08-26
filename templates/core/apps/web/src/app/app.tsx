import { AnimateBox, Text } from '@inithium/ui';

export function App() {
  return (
    <AnimateBox animation={{entrance: 'animate__fadeInUp', exit: 'animate__fadeOutDown'}} margin={{base:5, top:15}}>
      <Text bgColor={{color: 'primary', intensity: 500}} textColor={{color: 'primary-foreground', intensity: 500}} padding={{base:5}}>primary</Text>
    </AnimateBox>
  );
}

export default App;
