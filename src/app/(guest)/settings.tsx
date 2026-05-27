import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

const settingsRows = [
  'Privacy policy',
  'AI consent and data sharing',
  'Restore purchases',
  'Delete account',
  'Export local data',
];

export default function SettingsScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.body}>
        Guest mode works locally. Account, sync, AI, sharing, and purchases stay opt-in.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/welcome')}
        style={({ pressed }) => [styles.authRow, pressed ? styles.pressed : null]}>
        <Text style={styles.authRowTitle}>Sign in or create account</Text>
        <Text style={styles.authRowDetail}>Sync, share, and unlock premium features.</Text>
      </Pressable>
      {settingsRows.map((row) => (
        <View key={row} style={styles.row}>
          <Text style={styles.rowTitle}>{row}</Text>
          <Text style={styles.rowDetail}>Release-gated surface for App Store compliance.</Text>
        </View>
      ))}
      <Link href="/planner" style={styles.link}>
        Open weekly planner
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  body: { color: Colors.light.textSecondary, fontSize: 16, lineHeight: 24 },
  authRow: {
    minHeight: 72,
    borderRadius: 8,
    padding: Spacing.three,
    backgroundColor: '#FFF3E0',
    borderColor: '#F1B35C',
    borderWidth: 1,
  },
  authRowTitle: { color: Colors.light.text, fontSize: 16, fontWeight: '800' },
  authRowDetail: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  row: {
    minHeight: 64,
    borderRadius: 8,
    padding: Spacing.three,
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderWidth: 1,
  },
  rowTitle: { color: Colors.light.text, fontSize: 16, fontWeight: '800' },
  rowDetail: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  link: {
    minHeight: 44,
    color: Colors.light.blue,
    fontSize: 16,
    fontWeight: '800',
    paddingVertical: 12,
  },
  pressed: { opacity: 0.84 },
});
