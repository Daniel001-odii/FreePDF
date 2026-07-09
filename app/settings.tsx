import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { Alert, Linking, Platform, Pressable, ScrollView, Share, Switch, Text, View } from 'react-native';

import { Palette } from '@/constants/Colors';
import { useSettingsStore } from '@/src/stores/settingsStore';



import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

export function HugeiconsArrowLeft01(props: any) {
  return (
    <Svg width="28" height="28" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 6s-6 4.419-6 6s6 6 6 6" /></Svg>
  )
}

export function HugeiconsShare03(props: any) {
  return (
    <Svg width="28" height="28" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7s2.196-2.716 3.404-3.761a.9.9 0 0 1 .63-.238a.92.92 0 0 1 .562.238C13.804 4.284 16 7 16 7m-3.966-3v11M8 11c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 0 0-1.093 1.092C4 12.9 4 13.6 4 15v1c0 2.357 0 3.535.732 4.268S6.643 21 9 21h6c2.357 0 3.535 0 4.268-.732C20 19.535 20 18.357 20 16v-1c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.092C18.1 11 17.4 11 16 11" /></Svg>
  )
}

export default function SettingsScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const compression = useSettingsStore((s) => s.defaultCompressionQuality);
  const setCompression = useSettingsStore((s) => s.setCompressionQuality);
  const autoSave = useSettingsStore((s) => s.autoSaveResults);
  const setAutoSave = useSettingsStore((s) => s.setAutoSaveResults);
  const showPremium = useSettingsStore((s) => s.showPremiumBadges);
  const setShowPremium = useSettingsStore((s) => s.setShowPremiumBadges);

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out FreePDF - the ultimate mobile PDF utility app! Convert images, merge documents, compress files and more.',
        url: Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/freepdf/id123456789'
          : 'https://play.google.com/store/apps/details?id=com.daniel_odii.FreePDF',
      });
    } catch (err) {
      console.error('Error sharing app:', err);
    }
  };

  const handleRateUs = async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      } else {
        const storeUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/app/freepdf/id123456789?action=write-review'
          : 'market://details?id=com.daniel_odii.FreePDF';
        Linking.openURL(storeUrl);
      }
    } catch (err) {
      console.error('Error rating app:', err);
      const storeUrl = Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/freepdf/id123456789'
        : 'https://play.google.com/store/apps/details?id=com.daniel_odii.FreePDF';
      Linking.openURL(storeUrl);
    }
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:support@freepdfapp.com?subject=FreePDF%20Feedback').catch(() => {
      Alert.alert('Error', 'Mail app is not configured on this device. Please contact support@freepdfapp.com.');
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 90, }}
    >
      {/* Header */}
      <View className="px-6 pb-4 flex flex-row">
        <Pressable className="flex flex-row gap-3" onPress={() => router.back()}>
          <HugeiconsArrowLeft01 />
          <Text className="text-3xl font-black text-white" style={{
            fontFamily: "RocaTwoBold"
          }}>
            Settings
          </Text>
        </Pressable>

      </View>

      {/* Premium Banner */}
      {/* {showPremium && (
        <View className="px-6 pb-6">
          <View className="bg-[#FF3B30] rounded-3xl p-5 overflow-hidden">
            <Text className="text-white/80 font-bold text-xs uppercase tracking-wider">
              Limited Time Offer
            </Text>
            <Text className="text-white font-black text-2xl mt-1">
              Go Premium · 30% OFF
            </Text>
            <View className="bg-black/30 self-start rounded-full px-4 py-2 mt-4">
              <Text className="text-white font-bold text-xs">Claim</Text>
            </View>
          </View>
        </View>
      )} */}

      <View className="px-6">
        {/* General */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-3 px-1">
            General
          </Text>
          <View className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <Pressable onPress={() => router.push('/settings/scan')}>
              <NavRow label="Scan Settings" />
            </Pressable>
            <Divider />
            <NavRow label="Language" value="English" />
          </View>
        </View>

        {/* PDF Settings */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-3 px-1">
            PDF
          </Text>
          <View className="bg-[#1C1C1E] rounded-2xl">
            <View className="px-5 py-4">
              <Text className="text-base font-extrabold text-white">
                Default Compression Quality
              </Text>
              <Text className="text-sm font-bold text-[#9C9CA3] mt-1">
                {compression}%
              </Text>
              <View className="flex-row items-center gap-2 mt-3">
                {[20, 40, 60, 80, 100].map((q) => (
                  <PressableButton
                    key={q}
                    label={`${q}`}
                    active={compression === q}
                    onPress={() => setCompression(q)}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Preferences */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-3 px-1">
            Preferences
          </Text>
          <View className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <SwitchRow
              label="Auto-save Results"
              value={autoSave}
              onValueChange={setAutoSave}
            />
            <Divider />
            <SwitchRow
              label="Show Premium Badges"
              value={showPremium}
              onValueChange={setShowPremium}
            />
          </View>
        </View>

        {/* Support */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-3 px-1">
            Support
          </Text>
          <View className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <Pressable onPress={() => Linking.openURL('https://freepdfapp.com/faq').catch(() => { })}>
              <NavRow label="FAQ" />
            </Pressable>
            <Divider />
            <Pressable onPress={handleShareApp}>
              <NavRow label="Share App" />
            </Pressable>
            <Divider />
            <Pressable onPress={handleRateUs}>
              <NavRow label="Rate Us" />
            </Pressable>
            <Divider />
            <Pressable onPress={handleFeedback}>
              <NavRow label="Feedback" />
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <View className="items-center pt-2 pb-4 flex-row justify-center gap-6">
          <Text className="text-[#FF3B30] font-bold text-xs">Privacy & Terms</Text>
          <Text className="text-[#5C5C61] font-bold text-xs">
            Version {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Divider() {
  return <View className="h-px bg-[#2C2C2E] ml-5" />;
}

function NavRow({ label, value }: { label: string; value?: string }) {
  return (
    <View className="flex-row items-center justify-between px-5 py-4">
      <Text className="text-base font-extrabold text-white">{label}</Text>
      <View className="flex-row items-center gap-2">
        {value && (
          <Text className="text-sm font-bold text-[#9C9CA3]">{value}</Text>
        )}
        <HugeiconsIcon icon={ArrowRight01Icon} color={Palette.textMuted} size={18} />
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-5 py-3.5">
      <Text className="text-base font-extrabold text-white">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#3A3A3C', true: '#FF3B30' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function PressableButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View>
      <Text
        onPress={onPress}
        className={`px-3 py-1.5 rounded-lg text-sm font-bold overflow-hidden ${active
          ? 'bg-[#FF3B30] text-white'
          : 'bg-[#0A0A0A] text-[#9C9CA3]'
          }`}
      >
        {label}
      </Text>
    </View>
  );
}
