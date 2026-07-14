import {
  Bookmark02Icon,
  Clock04Icon,
  FileStarIcon,
  Home01Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  const theme = useColorScheme();
  const colors = Colors[theme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 100,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <View className="w-7 h-7 items-center justify-center">
              <HugeiconsIcon icon={Home01Icon} color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="recents"
        options={{
          title: 'Recent',
          tabBarIcon: ({ size, color }) => (
            <View className="w-7 h-7 items-center justify-center">
              <HugeiconsIcon icon={Clock04Icon} color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="favorite"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ size, color }) => (
            <View className="w-7 h-7 items-center justify-center">
              <HugeiconsIcon icon={Bookmark02Icon} color={color} size={size} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'More',
          tabBarIcon: ({ size, color }) => (
            <View className="w-7 h-7 items-center justify-center">
              <HugeiconsIcon icon={FileStarIcon} color={color} size={size} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
