import { Camera } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { KitchenDesign } from '@/constants/kitchen-design';

export default function LensScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Camera size={32} stroke={KitchenDesign.colors.ink} />
        </View>
        <Text style={styles.title}>Kitchen Lens</Text>
        <Text style={styles.body}>
          Pantry, receipt, label, recipe, and leftovers scanning will use the screen 10 camera flow.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    padding: 18,
    paddingBottom: 112,
  },
  card: {
    minHeight: 220,
    borderRadius: 18,
    padding: 24,
    gap: 14,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6DFC8',
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  body: {
    color: KitchenDesign.colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
});
