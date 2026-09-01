import { useParams } from 'react-router-dom';
import { Box, Text } from '@inithium/ui';
import { cmsModules } from './modules/registry';

export const ModuleRenderer = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const cmsModule = cmsModules.find((candidate) => candidate.id === moduleId);

  if (!cmsModule) {
    return (
      <Box padding={{ base: 24 }}>
        <Text as="h1" className="text-xl font-bold">
          Module not found
        </Text>
        <Text as="p" className="text-surface-600">
          &quot;{moduleId}&quot; isn&apos;t a registered CMS module.
        </Text>
      </Box>
    );
  }

  const Component = cmsModule.Component;
  return <Component />;
};
