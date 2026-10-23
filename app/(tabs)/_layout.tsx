import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTheme } from '@/hooks/useTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const tabs = [
  { name: 'index', title: 'Today', icon: 'home', outline: 'home-outline', module: null },
  { name: 'expenses', title: 'Expenses', icon: 'wallet', outline: 'wallet-outline', module: 'expenses' },
  { name: 'habits', title: 'Habits', icon: 'grid', outline: 'grid-outline', module: 'habits' },
  { name: 'diary', title: 'Diary', icon: 'calendar', outline: 'calendar-outline', module: 'diary' },
  { name: 'notes', title: 'Notes', icon: 'document-text', outline: 'document-text-outline', module: 'notes' },
] as const satisfies readonly {
  name: string; title: string; icon: IconName; outline: IconName;
  module: 'expenses' | 'habits' | 'diary' | 'notes' | null;
}[];

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: theme.colors.background },
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
      tabBarLabelStyle: { fontSize: theme.typography.caption },
      tabBarItemStyle: { minHeight: theme.spacing.xxl },
    }}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{
          title: tab.title,
          tabBarActiveTintColor: tab.module ? theme.moduleColors[tab.module] : theme.colors.accent,
          tabBarIcon: ({ size, focused }) => (
            <Ionicons name={focused ? tab.icon : tab.outline}
              color={focused ? (tab.module ? theme.moduleColors[tab.module] : theme.colors.accent) : theme.colors.textSecondary}
              size={size} />
          ),
        }} />
      ))}
    </Tabs>
  );
}
