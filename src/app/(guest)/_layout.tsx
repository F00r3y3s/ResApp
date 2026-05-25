import { Tabs } from 'expo-router';
import {
    BookOpen,
    CalendarDays,
    Camera,
    Home,
    Settings,
    ShoppingBasket,
    Wheat,
} from 'lucide-react-native';

import { KitchenDesign } from '@/constants/kitchen-design';

export default function GuestTabsLayout() {
  const tintColor = KitchenDesign.colors.orange;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: '#333333',
        tabBarStyle: {
          minHeight: 86,
          paddingTop: 12,
          paddingBottom: 12,
          backgroundColor: KitchenDesign.colors.porcelain,
          borderTopColor: KitchenDesign.colors.border,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '500',
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
        name="lens"
        options={{
          title: 'Lens',
          tabBarIcon: ({ color, size }) => <Camera size={size} stroke={color} />,
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
        name="planner"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => <CalendarDays size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'Grocery',
          tabBarIcon: ({ color, size }) => <ShoppingBasket size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          href: null,
          title: 'Pantry',
          tabBarIcon: ({ color, size }) => <Wheat size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} stroke={color} />,
        }}
      />
      <Tabs.Screen
        name="recipe/[id]"
        options={{
          href: null,
          title: 'Recipe detail',
        }}
      />
      <Tabs.Screen
        name="recipe/cook/[id]"
        options={{
          href: null,
          title: 'Cook mode',
        }}
      />
      <Tabs.Screen
        name="onboarding"
        options={{
          href: null,
          title: 'Onboarding',
        }}
      />
      <Tabs.Screen
        name="sync-consent"
        options={{
          href: null,
          title: 'Sync consent',
        }}
      />
    </Tabs>
  );
}
