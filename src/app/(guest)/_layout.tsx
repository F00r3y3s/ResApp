import { Tabs } from 'expo-router';
import { BookOpen, CalendarDays, Home, ListChecks, Settings, Wheat } from 'lucide-react-native';

import { KitchenDesign } from '@/constants/kitchen-design';

export default function GuestTabsLayout() {
  const tintColor = KitchenDesign.colors.ink;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: KitchenDesign.colors.muted,
        tabBarStyle: {
          minHeight: 76,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: KitchenDesign.colors.porcelain,
          borderTopColor: KitchenDesign.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Home size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => <Wheat size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'Grocery',
          tabBarIcon: ({ color, size }) => <ListChecks size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          href: null,
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} stroke={color} />,
        }}
      />
    </Tabs>
  );
}
