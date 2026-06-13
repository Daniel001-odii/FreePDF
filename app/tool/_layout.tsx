import { Stack } from 'expo-router';

export default function ToolLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: { fontWeight: '600' },
      }}
    />
  );
}