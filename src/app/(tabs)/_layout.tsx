import { TabList, Tabs, TabTrigger } from 'expo-router/ui';
import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { FabActionProvider, useRunFabAction } from '@/components/navigation/FabAction';
import { FadeTabSlot } from '@/components/navigation/FadeTabSlot';
import { TabBar, TabBarItem } from '@/components/navigation/TabBar';
import { FAB } from '@/components/ui/FAB';
import { BlurTargetContent, BlurTargetProvider } from '@/components/ui/glass/BlurTarget';
import { useTabBarBottom } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';

const tabs = [
  { name: 'index', href: '/', title: 'Today', icon: 'home' },
  { name: 'expenses', href: '/expenses', title: 'Expenses', icon: 'wallet' },
  { name: 'habits', href: '/habits', title: 'Habits', icon: 'habits' },
  { name: 'diary', href: '/diary', title: 'Diary', icon: 'calendar' },
  { name: 'notes', href: '/notes', title: 'Notes', icon: 'note' },
] as const;

function TabFab() {
  const runFabAction = useRunFabAction();
  return <FAB onPress={runFabAction} />;
}

export default function TabLayout() {
  const pathname = usePathname();
  const theme = useTheme();
  const bottom = useTabBarBottom();

  return (
    <FabActionProvider>
      <BlurTargetProvider>
        <Tabs style={[styles.fill, { backgroundColor: theme.colors.groupedBackground }]}>
          {/* Route registration must be a direct child of Tabs (SDK 58). */}
          <TabList style={{ display: 'none' }}>
            {tabs.map((tab) => <TabTrigger key={tab.name} name={tab.name} href={tab.href} />)}
          </TabList>
          {/* Scenes are the blur target so the floating bar shows them blurred behind it. */}
          <BlurTargetContent>
            <FadeTabSlot />
          </BlurTargetContent>
          <View
            pointerEvents="box-none"
            style={[styles.bar, { bottom, left: theme.sizes.screenInset, right: theme.sizes.screenInset, gap: theme.spacing.md }]}
          >
              <TabBar itemCount={tabs.length}>
                {tabs.map((tab, index) => (
                  <TabTrigger key={tab.name} name={tab.name} asChild>
                    <TabBarItem index={index} title={tab.title} icon={tab.icon} active={pathname === tab.href} />
                  </TabTrigger>
                ))}
              </TabBar>
            <TabFab />
          </View>
        </Tabs>
      </BlurTargetProvider>
    </FabActionProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
});
