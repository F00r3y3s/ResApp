import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

const recipeSeeds = ['Family Lentil Soup', 'Herb Chicken Tray Bake', 'Tomato Rice Skillet'];

export default function RecipesScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <Text style={styles.title}>Recipe library</Text>
      <Text style={styles.body}>
        Seed recipes use owned or permissive content only. Personal recipes save locally before sync.
      </Text>
      {recipeSeeds.map((recipe) => (
        <View key={recipe} style={styles.card}>
          <Text style={styles.cardTitle}>{recipe}</Text>
          <Text style={styles.cardDetail}>Offline-ready seed content with attribution metadata.</Text>
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
  card: {
    minHeight: 84,
    borderRadius: 8,
    padding: Spacing.three,
    backgroundColor: '#fffdf8',
    borderColor: Colors.light.border,
    borderWidth: 1,
  },
  cardTitle: { color: Colors.light.text, fontSize: 18, fontWeight: '800' },
  cardDetail: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
});
