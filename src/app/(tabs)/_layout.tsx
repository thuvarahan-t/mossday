import { TabList, Tabs, TabTrigger } from 'expo-router/ui';
import { router, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TabSceneSlot } from '@/components/navigation/TabSceneSlot';
import { TabBar, TabBarItem } from '@/components/navigation/TabBar';
import { BlurTargetContent, BlurTargetProvider } from '@/components/ui/glass/BlurTarget';
import { useTabBarBottom } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';

// Today sits in the middle of the bar, within thumb reach from either side.
const tabs = [
  { name: 'habits', href: '/habits', title: 'Habits', icon: 'habits' },
  { name: 'expenses', href: '/expenses', title: 'Expenses', icon: 'wallet' },
  { name: 'index', href: '/', title: 'Today', icon: 'home' },
  { name: 'diary', href: '/diary', title: 'Diary', icon: 'calendar' },
  { name: 'notes', href: '/notes', title: 'Notes', icon: 'note' },
] as const;
const routeOrder = [...tabs].sort((a, b) => Number(b.name === 'index') - Number(a.name === 'index'));

export default function TabLayout() {
  const pathname = usePathname();
  const theme = useTheme();
  const bottom = useTabBarBottom();

  return (
    <BlurTargetProvider>
      <Tabs style={[styles.fill, { backgroundColor: theme.colors.groupedBackground }]}>
        {/* Route registration must be a direct child of Tabs (SDK 58). The first trigger is the
            initial route, so Today registers first even though it sits in the middle of the bar;
            otherwise Habits mounts first and Today's cards start animating while hidden. */}
        <TabList style={{ display: 'none' }}>
          {routeOrder.map((tab) => <TabTrigger key={tab.name} name={tab.name} href={tab.href} />)}
        </TabList>
        {/* Scenes are the blur target so the floating bar shows them blurred behind it. */}
        <BlurTargetContent>
          <TabSceneSlot />
        </BlurTargetContent>
        <View
          pointerEvents="box-none"
          style={[styles.bar, { bottom, left: theme.sizes.screenInset, right: theme.sizes.screenInset, height: theme.sizes.tabBarHeight }]}
        >
          <TabBar itemCount={tabs.length} onSelect={(index) => { if (pathname !== tabs[index].href) router.navigate(tabs[index].href); }}>
            {tabs.map((tab, index) => (
              <TabTrigger key={tab.name} name={tab.name} asChild>
                <TabBarItem index={index} title={tab.title} icon={tab.icon} active={pathname === tab.href} />
              </TabTrigger>
            ))}
          </TabBar>
        </View>
      </Tabs>
    </BlurTargetProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { position: 'absolute', flexDirection: 'row' },
});
