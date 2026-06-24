import { Stack } from 'expo-router';

import { COLORS } from '@/constants/theme';

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.onSurface,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="layout-selection" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ headerShown: false }} />
      <Stack.Screen name="preview" options={{ headerShown: false }} />
      <Stack.Screen name="printing" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen
        name="help"
        options={{
          presentation: 'modal',
          title: 'Help',
        }}
      />
    </Stack>
  );
}
