import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export default function PlannerScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weekly planner</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manual planning comes first</Text>
        <Text style={styles.cardDetail}>
          Smart Chef Lite and Premium AI planning will build on the same validated plan model.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  card: {
    minHeight: 96,
    borderRadius: 8,
    padding: Spacing.three,
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderWidth: 1,
  },
  cardTitle: { color: Colors.light.text, fontSize: 18, fontWeight: '800' },
  cardDetail: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
});
