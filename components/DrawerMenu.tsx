import { useRouter } from 'expo-router';
import {
    Alert,
    Dimensions,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    Share,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

import { useDrawerStore } from '@/src/stores/drawerStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HugeIcon } from './HugeIcon';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

interface MenuItem {
  label: string;
  icon: Parameters<typeof HugeIcon>[0]['name'];
  onPress: () => void;
  divider?: boolean;
}

export function DrawerMenu() {
  const isOpen = useDrawerStore((s) => s.isOpen);
  const close = useDrawerStore((s) => s.close);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOpen ? 1 : 0, { duration: 280 }),
    pointerEvents: isOpen ? 'auto' : 'none',
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withTiming(isOpen ? 0 : DRAWER_WIDTH, { duration: 300 }) },
    ],
  }));

  const navigate = (route: string) => {
    close();
    setTimeout(() => router.push(route as any), 300);
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Home',
      icon: 'home',
      onPress: () => navigate('/'),
    },
    {
      label: 'Recent Files',
      icon: 'recents',
      onPress: () => navigate('/recents'),
    },
    {
      label: 'Favorites',
      icon: 'favorites',
      onPress: () => navigate('/favorite'),
    },
    {
      label: 'Tools',
      icon: 'search',
      onPress: () => navigate('/tools'),
    },
    { label: '', icon: 'home', onPress: () => {}, divider: true },
    {
      label: 'Settings',
      icon: 'settings',
      onPress: () => navigate('/settings'),
    },
    {
      label: 'Privacy Policy',
      icon: 'privacy',
      onPress: () =>
        Linking.openURL('https://freepdf.app/privacy'),
    },
    {
      label: 'Rate App',
      icon: 'rate',
      onPress: () =>
        Alert.alert('Rate App', 'Would you like to rate FreePDF?'),
    },
    {
      label: 'Share App',
      icon: 'share',
      onPress: () =>
        Share.share({ message: 'Check out FreePDF – the ultimate PDF toolkit!' }),
    },
    {
      label: 'About',
      icon: 'about',
      onPress: () => navigate('/about'),
    },
  ];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      {/* Overlay */}
      <Animated.View
        style={overlayStyle}
        className="absolute inset-0 bg-black/50"
      >
        <Pressable className="flex-1" onPress={close} />
      </Animated.View>

      {/* Drawer – slides in from right */}
      <Animated.View
        style={[
          drawerStyle,
          {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
          },
        ]}
        className="bg-white dark:bg-[#161618] shadow-2xl"
      >
        <View
          style={{ paddingTop: insets.top + 16 }}
          className="flex-1"
        >
          {/* Header */}
          <View className="px-6 pb-6 border-b border-gray-100 dark:border-[#2C2C2E]">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                FreePDF
              </Text>
              <Pressable onPress={close} className="p-2 -mr-2">
                <HugeIcon
                  name="settings"
                  size={22}
                  color="#9ca3af"
                />
              </Pressable>
            </View>
          </View>

          {/* Menu Items */}
          <ScrollView
            className="flex-1 px-3 pt-2"
            showsVerticalScrollIndicator={false}
          >
            {menuItems.map((item, index) => {
              if (item.divider) {
                return (
                  <View
                    key={`div-${index}`}
                    className="h-px bg-gray-100 dark:bg-[#2C2C2E] my-3 mx-3"
                  />
                );
              }
              return (
                <Pressable
                  key={item.label}
                  onPress={item.onPress}
                  className="flex-row items-center px-3 py-3.5 rounded-xl active:bg-gray-100 dark:active:bg-[#2C2C2E]"
                >
                  <HugeIcon
                    name={item.icon}
                    size={22}
                    color="#6b7280"
                  />
                  <Text className="ml-3 text-base font-medium text-gray-700 dark:text-gray-300">
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View className="px-6 py-4 border-t border-gray-100 dark:border-[#2C2C2E]">
            <Text className="text-xs text-gray-400 dark:text-gray-600 text-center">
              FreePDF v1.0.0
            </Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}