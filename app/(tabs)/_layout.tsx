import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTheme } from '@/hooks/useTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const tabs = [
  { name: 'index', title: 'Today', icon: 'home', outline: 'home-outline' },
  { name: 'expenses', title: 'Expenses', icon: 'wallet', outline: 'wallet-outline' },
  { name: 'habits', title: 'Habits', icon: 'grid', outline: 'grid-outline' },
  { name: 'diary', title: 'Diary', icon: 'calendar', outline: 'calendar-outline' },
  { name: 'notes', title: 'Notes', icon: 'document-text', outline: 'document-text-outline' },
] as const satisfies readonly {
  name: string; title: string; icon: IconName; outline: IconName;
}[];

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: theme.colors.groupedBackground },
      tabBarActiveTintColor: theme.colors.accent,
      tabBarInactiveTintColor: theme.colors.label,
      tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.separator },
      tabBarItemStyle: { minHeight: theme.sizes.touchTarget },
    }}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.title,
          tabBarIcon: ({ size, focused }) => (
            <Ionicons name={focused ? tab.icon : tab.outline} size={size}
              color={focused ? theme.colors.accent : theme.colors.label} />
          ),
        }} />
      ))}
    </Tabs>
  );
}
