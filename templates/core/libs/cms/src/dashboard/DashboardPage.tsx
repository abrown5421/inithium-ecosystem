import { Box, Text, mergeClassNames } from '@inithium/ui';
import { dashboardWidgets } from './widgets/registry';
import type { DashboardWidget } from './widgets/registry';

const SPAN_CLASSES: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
};

const spanClassName = (span: DashboardWidget['span']): string => SPAN_CLASSES[span ?? 1] ?? SPAN_CLASSES[1];

// The dashboard's own contribution to the widget system it hosts: renders whatever
// dashboardWidgets discovered, in registration order, on a responsive 3-column grid. Has zero
// knowledge of any individual widget's content - a widget is just a title + a component that
// renders itself inside a card this page provides.
export const DashboardPage = () => (
  <Box padding={{ base: 24 }} flex={{ direction: 'col', gap: 16 }}>
    <Text as="h1" className="text-2xl font-bold">
      Dashboard
    </Text>

    {dashboardWidgets.length === 0 ? (
      <Text as="p" className="text-surface-600">
        Welcome to the Inithium CMS. Widgets installed by plugins will appear here.
      </Text>
    ) : (
      <Box className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {dashboardWidgets.map((widget) => (
          <Box
            key={widget.id}
            bgColor={{ color: 'surface', intensity: 100 }}
            borderColor={{ color: 'surface', intensity: 200 }}
            padding={{ base: 16 }}
            className={mergeClassNames('rounded border', spanClassName(widget.span))}
          >
            {widget.title ? (
              <Text as="h2" className="mb-2 text-lg font-semibold">
                {widget.title}
              </Text>
            ) : null}
            <widget.Component />
          </Box>
        ))}
      </Box>
    )}
  </Box>
);
