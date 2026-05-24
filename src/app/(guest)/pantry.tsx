import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

const sections = ['Fridge', 'Freezer', 'Pantry'];

export default function PantryScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Text style={styles.title}>Local pantry</Text>
      <Text style={styles.body}>
        Pantry records are written on-device first with quantity, unit, expiry, and location metadata.
      </Text>
      {sections.map((section) => (
        <View key={section} style={styles.row}>
          <Text style={styles.rowTitle}>{section}</Text>
          <Text style={styles.rowDetail}>Ready for manual item entry in the pantry slice.</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  body: { color: Colors.light.textSecondary, fontSize: 16, lineHeight: 24 },
  row: {
    minHeight: 72,
    borderRadius: 8,
    padding: Spacing.three,
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderWidth: 1,
  },
  rowTitle: { color: Colors.light.text, fontSize: 18, fontWeight: '800' },
  rowDetail: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
});
