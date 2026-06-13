import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ScrollView, Switch, Text, View } from 'react-native';

import { Palette } from '@/constants/Colors';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function SettingsScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const compression = useSettingsStore((s) => s.defaultCompressionQuality);
  const setCompression = useSettingsStore((s) => s.setCompressionQuality);
  const autoSave = useSettingsStore((s) => s.autoSaveResults);
  const setAutoSave = useSettingsStore((s) => s.setAutoSaveResults);
  const showPremium = useSettingsStore((s) => s.showPremiumBadges);
  const setShowPremium = useSettingsStore((s) => s.setShowPremiumBadges);

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0A]"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 90, }}
    >
      {/* Header */}
      <View className="px-6 pb-4">
        <Text className="text-3xl font-black text-white tracking-tight" style={{
              fontFamily: "RocaTwoBold"
            }}>
          Settings
        </Text>
      </View>

      {/* Premium Banner */}
     {/*  <View className="px-6 pb-6">
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
      </View> */}

      <View className="px-6">
        {/* General */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-3 px-1">
            General
          </Text>
          <View className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <NavRow label="Scan Settings" />
            <Divider />
            <NavRow label="Language" value="Default" />
            <Divider />
            <NavRow label="Appearance" />
          </View>
        </View>

        {/* Appearance Theme */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-3 px-1">
            Theme
          </Text>
          <View className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
            {(['light', 'dark', 'system'] as const).map((t, i, arr) => (
              <View key={t}>
                <SwitchRow
                  label={t === 'system' ? 'System Default' : t.charAt(0).toUpperCase() + t.slice(1)}
                  value={theme === t}
                  onValueChange={() => setTheme(t)}
                />
                {i < arr.length - 1 && <Divider />}
              </View>
            ))}
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
            <NavRow label="FAQ" />
            <Divider />
            <NavRow label="Share App" />
            <Divider />
            <NavRow label="Rate Us" />
            <Divider />
            <NavRow label="Feedback" />
          </View>
        </View>

        {/* Footer */}
        <View className="items-center pt-2 pb-4 flex-row justify-center gap-6">
          <Text className="text-[#FF3B30] font-bold text-xs">Privacy & Terms</Text>
          <Text className="text-[#5C5C61] font-bold text-xs">Version 1.4.0</Text>
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
        className={`px-3 py-1.5 rounded-lg text-sm font-bold overflow-hidden ${
          active
            ? 'bg-[#FF3B30] text-white'
            : 'bg-[#0A0A0A] text-[#9C9CA3]'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}
