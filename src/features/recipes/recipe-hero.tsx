import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

import { KitchenAssets, KitchenDesign } from '@/constants/kitchen-design';

type RecipeHeroProps = {
    /** Seed id is the key used to look up a hand-curated photo. */
    seedId: string | null;
    cuisine: string;
    title: string;
    /** Edge length in points — used for both width and height. */
    size: number;
    /** Optional override aspect — pass {height} only to render a wide hero. */
    height?: number;
    /** When true, the placeholder uses larger typography for the detail hero. */
    variant?: 'card' | 'hero';
    testID?: string;
};

/**
 * Map of seed ids → hand-cropped photos in the project's reference-crops folder.
 * Only seeds with a clear, on-brand photo are wired here. Everything else falls
 * back to an intentional initial-on-tinted-paper placeholder using the cuisine
 * palette so the library doesn't read as one repeated AI-slop tile.
 */
const SEED_PHOTOS: Record<string, ImageSourcePropType> = {
    'seed-002': KitchenAssets.todayTraybake,
    'seed-003': KitchenAssets.pantryTomatoes,
    'seed-004': KitchenAssets.pantrySpinach,
};

const cuisineTints: Record<string, { background: string; ink: string }> = {
    levantine: { background: '#F4DDC3', ink: '#7A4318' },
    british: { background: '#DDE7EE', ink: '#274F6D' },
    indian: { background: '#F4D5C2', ink: '#8E3D1A' },
    pakistani: { background: '#EFCFCF', ink: '#7A2A2A' },
    turkish: { background: '#EAD5BA', ink: '#6F4218' },
    emirati: { background: '#EFE3BF', ink: '#5A4310' },
};

const defaultTint = { background: KitchenDesign.colors.linen, ink: KitchenDesign.colors.ink };

export function RecipeHero({
    seedId,
    cuisine,
    title,
    size,
    height,
    variant = 'card',
    testID,
}: RecipeHeroProps) {
    const photo = seedId ? SEED_PHOTOS[seedId] : undefined;
    const dimensionStyle = { width: '100%' as const, height: height ?? size };
    const radius = variant === 'hero' ? 22 : 14;

    if (photo) {
        return (
            <Image
                accessibilityLabel={`${title} photo`}
                source={photo}
                resizeMode="cover"
                style={[styles.imageBase, dimensionStyle, { borderRadius: radius }]}
                testID={testID}
            />
        );
    }

    const tint = cuisineTints[cuisine.toLowerCase()] ?? defaultTint;
    const initials = computeInitials(title);
    const fontSize = variant === 'hero' ? 56 : 24;

    return (
        <View
            testID={testID}
            style={{
                width: dimensionStyle.width,
                height: dimensionStyle.height,
                borderRadius: radius,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tint.background,
            }}>
            <Text style={{ color: tint.ink, fontSize, fontWeight: '900', letterSpacing: 1 }}>
                {initials}
            </Text>
        </View>
    );
}

function computeInitials(title: string): string {
    const words = title
        .replace(/\([^)]*\)/g, '')
        .replace(/[^A-Za-z\s]/g, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0) {
        return '·';
    }
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

const styles = StyleSheet.create({
    imageBase: {
        backgroundColor: KitchenDesign.colors.linen,
    },
});
