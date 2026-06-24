import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, FONT_FAMILIES, SIZES } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.outline,
        tabBarStyle: {
          minHeight: SIZES.touchTargetMinimum,
          backgroundColor: COLORS.surfaceContainerLowest,
          borderTopColor: COLORS.outlineVariant,
        },
        tabBarLabelStyle: {
          fontFamily: FONT_FAMILIES.bold,
          fontSize: 14,
        },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Design',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paintpalette.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
