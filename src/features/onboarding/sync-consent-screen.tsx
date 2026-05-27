import { router } from 'expo-router';
import { Cloud, LockKeyhole, Smartphone } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { KitchenDesign } from '@/constants/kitchen-design';

const consentRows = [
  {
    title: 'Local first',
    body: 'Your pantry, recipes, and preferences stay on this phone first.',
    Icon: Smartphone,
  },
  {
    title: 'Account sync is optional',
    body: 'Household sharing and cloud backup only start after you create an account.',
    Icon: Cloud,
  },
  {
    title: 'Private by default',
    body: 'AI, social sharing, uploads, and purchases stay off until you explicitly opt in.',
    Icon: LockKeyhole,
  },
] as const;

export function SyncConsentScreenContent() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync consent</Text>
        <Text style={styles.body}>
          Keep cooking as a guest. Sync can wait until your household needs sharing or backup.
        </Text>
      </View>

      <View style={styles.rows}>
        {consentRows.map(({ title, body, Icon }) => (
          <View key={title} style={styles.row}>
            <View style={styles.iconWrap}>
              <Icon size={26} stroke={KitchenDesign.colors.ink} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{title}</Text>
              <Text style={styles.rowBody}>{body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/')}
        style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}>
        <Text style={styles.primaryButtonText}>Create account later</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KitchenDesign.colors.cream },
  content: { padding: 18, paddingBottom: 112, gap: 20 },
  header: { gap: 12 },
  title: { color: KitchenDesign.colors.ink, fontSize: 34, lineHeight: 40, fontWeight: '900' },
  body: { color: KitchenDesign.colors.muted, fontSize: 17, lineHeight: 25 },
  rows: { gap: 12 },
  row: {
    minHeight: 96,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6DFC8',
  },
  rowCopy: { flex: 1, gap: 5 },
  rowTitle: { color: KitchenDesign.colors.ink, fontSize: 18, fontWeight: '900' },
  rowBody: { color: KitchenDesign.colors.muted, fontSize: 14, lineHeight: 20 },
  primaryButton: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: { color: KitchenDesign.colors.cream, fontSize: 19, fontWeight: '900' },
  pressed: { opacity: 0.84 },
});
