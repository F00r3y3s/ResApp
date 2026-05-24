import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { buildTodaySummary } from '@/features/today/today-model';

const summary = buildTodaySummary({
  pantryExpiringCount: 2,
  savedRecipeCount: 4,
  groceryOpenCount: 6,
  isOnline: false,
  hasAccount: false,
});

export default function TodayScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{summary.modeLabel}</Text>
        <Text style={styles.title}>Cook from what your family already has.</Text>
        <Text style={styles.body}>{summary.networkMessage}</Text>
      </View>

      <View style={styles.cardGrid}>
        {summary.cards.map((card) => (
          <View key={card.title} style={styles.metricCard}>
            <Text style={styles.metricValue}>{card.value}</Text>
            <Text style={styles.metricTitle}>{card.title}</Text>
            <Text style={styles.metricDetail}>{card.detail}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>First value path</Text>
        <View style={styles.actionRow}>
          <Text style={styles.actionTitle}>Add a pantry item</Text>
          <Text style={styles.actionDetail}>Saved locally first, then syncs after account consent.</Text>
        </View>
        <View style={styles.actionRow}>
          <Text style={styles.actionTitle}>Save a recipe</Text>
          <Text style={styles.actionDetail}>Personal recipes remain usable without network access.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  hero: {
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  eyebrow: {
    color: Colors.light.herb,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.light.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  body: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  cardGrid: {
    gap: Spacing.three,
  },
  metricCard: {
    minHeight: 116,
    borderRadius: 8,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: '#fffdf8',
  },
  metricValue: {
    color: Colors.light.tomato,
    fontSize: 34,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '800',
  },
  metricDetail: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '900',
  },
  actionRow: {
    minHeight: 72,
    borderRadius: 8,
    padding: Spacing.three,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  actionTitle: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '800',
  },
  actionDetail: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
