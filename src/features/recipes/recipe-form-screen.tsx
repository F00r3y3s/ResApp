import { router } from 'expo-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ZodError } from 'zod';

import { KitchenDesign } from '@/constants/kitchen-design';

import { recipeInputSchema, type RecipesRepository } from './recipes-repository';

type RecipeFormScreenContentProps = {
    repository: RecipesRepository;
};

type IngredientRow = { name: string; quantity: string; unit: string };
type StepRow = { instruction: string };

const initialIngredients: IngredientRow[] = [{ name: '', quantity: '', unit: '' }];
const initialSteps: StepRow[] = [{ instruction: '' }];

export function RecipeFormScreenContent({ repository }: RecipeFormScreenContentProps) {
    const insets = useSafeAreaInsets();
    const [title, setTitle] = useState('');
    const [cuisine, setCuisine] = useState('');
    const [servings, setServings] = useState('4');
    const [ingredients, setIngredients] = useState<IngredientRow[]>(initialIngredients);
    const [steps, setSteps] = useState<StepRow[]>(initialSteps);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        if (isSaving) {
            return;
        }
        setIsSaving(true);
        setErrorMessage(null);

        try {
            const input = recipeInputSchema.parse({
                title,
                cuisine,
                servings,
                ingredients: ingredients.map((row) => ({
                    name: row.name,
                    quantity: row.quantity,
                    unit: row.unit,
                })),
                steps: steps.map((row, index) => ({
                    order: index + 1,
                    instruction: row.instruction,
                })),
            });
            await repository.createRecipe(input);
            router.back();
        } catch (error) {
            if (error instanceof ZodError) {
                setErrorMessage(error.issues[0]?.message ?? 'Please check the form');
            } else {
                setErrorMessage(error instanceof Error ? error.message : 'Could not save the recipe.');
            }
        } finally {
            setIsSaving(false);
        }
    }

    function addIngredient() {
        setIngredients((current) => [...current, { name: '', quantity: '', unit: '' }]);
    }

    function removeIngredient(index: number) {
        setIngredients((current) =>
            current.length <= 1 ? current : current.filter((_, i) => i !== index),
        );
    }

    function addStep() {
        setSteps((current) => [...current, { instruction: '' }]);
    }

    function removeStep(index: number) {
        setSteps((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 18) }]}
            keyboardShouldPersistTaps="handled">
            <View style={styles.headerRow}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
                    <ArrowLeft size={22} stroke={KitchenDesign.colors.ink} />
                </Pressable>
                <Text style={styles.headerTitle}>New recipe</Text>
                <View style={styles.iconButton} />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Recipe title"
                    placeholderTextColor={KitchenDesign.colors.muted}
                    style={styles.input}
                />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Cuisine</Text>
                <TextInput
                    value={cuisine}
                    onChangeText={setCuisine}
                    placeholder="Cuisine"
                    placeholderTextColor={KitchenDesign.colors.muted}
                    style={styles.input}
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Servings</Text>
                <TextInput
                    value={servings}
                    onChangeText={setServings}
                    placeholder="Servings"
                    placeholderTextColor={KitchenDesign.colors.muted}
                    style={styles.input}
                    keyboardType="number-pad"
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {ingredients.map((row, index) => (
                    <View key={`ingredient-${index}`} style={styles.ingredientRow}>
                        <TextInput
                            value={row.name}
                            onChangeText={(v) =>
                                setIngredients((current) => updateRow(current, index, { name: v }))
                            }
                            placeholder={`Ingredient ${index + 1} name`}
                            placeholderTextColor={KitchenDesign.colors.muted}
                            style={[styles.input, styles.flex2]}
                        />
                        <TextInput
                            value={row.quantity}
                            onChangeText={(v) =>
                                setIngredients((current) => updateRow(current, index, { quantity: v }))
                            }
                            placeholder={`Ingredient ${index + 1} quantity`}
                            placeholderTextColor={KitchenDesign.colors.muted}
                            style={[styles.input, styles.flex1]}
                        />
                        <TextInput
                            value={row.unit}
                            onChangeText={(v) =>
                                setIngredients((current) => updateRow(current, index, { unit: v }))
                            }
                            placeholder={`Ingredient ${index + 1} unit`}
                            placeholderTextColor={KitchenDesign.colors.muted}
                            style={[styles.input, styles.flex1]}
                        />
                        {ingredients.length > 1 ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Remove ingredient ${index + 1}`}
                                onPress={() => removeIngredient(index)}
                                style={({ pressed }) => [
                                    styles.smallIconButton,
                                    pressed ? styles.pressed : null,
                                ]}>
                                <Trash2 size={18} stroke={KitchenDesign.colors.danger} />
                            </Pressable>
                        ) : null}
                    </View>
                ))}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add ingredient"
                    onPress={addIngredient}
                    style={({ pressed }) => [styles.addRowButton, pressed ? styles.pressed : null]}>
                    <Plus size={18} stroke={KitchenDesign.colors.ink} />
                    <Text style={styles.addRowText}>Add ingredient</Text>
                </Pressable>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Method</Text>
                {steps.map((row, index) => (
                    <View key={`step-${index}`} style={styles.stepRow}>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepBadgeText}>{index + 1}</Text>
                        </View>
                        <TextInput
                            value={row.instruction}
                            onChangeText={(v) =>
                                setSteps((current) => updateRow(current, index, { instruction: v }))
                            }
                            placeholder={`Step ${index + 1} instructions`}
                            placeholderTextColor={KitchenDesign.colors.muted}
                            style={[styles.input, styles.flex1, styles.multiline]}
                            multiline
                        />
                        {steps.length > 1 ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Remove step ${index + 1}`}
                                onPress={() => removeStep(index)}
                                style={({ pressed }) => [
                                    styles.smallIconButton,
                                    pressed ? styles.pressed : null,
                                ]}>
                                <Trash2 size={18} stroke={KitchenDesign.colors.danger} />
                            </Pressable>
                        ) : null}
                    </View>
                ))}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add step"
                    onPress={addStep}
                    style={({ pressed }) => [styles.addRowButton, pressed ? styles.pressed : null]}>
                    <Plus size={18} stroke={KitchenDesign.colors.ink} />
                    <Text style={styles.addRowText}>Add step</Text>
                </Pressable>
            </View>

            {errorMessage ? (
                <Text selectable style={styles.errorText}>
                    {errorMessage}
                </Text>
            ) : null}

            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save recipe"
                onPress={handleSave}
                disabled={isSaving}
                style={({ pressed }) => [
                    styles.saveButton,
                    pressed && !isSaving ? styles.pressed : null,
                ]}>
                {isSaving ? (
                    <ActivityIndicator color={KitchenDesign.colors.cream} />
                ) : (
                    <Text style={styles.saveButtonText}>Save recipe</Text>
                )}
            </Pressable>
        </ScrollView>
    );
}

function updateRow<T>(rows: T[], index: number, patch: Partial<T>): T[] {
    return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: KitchenDesign.colors.cream },
    content: { paddingHorizontal: 18, paddingBottom: 140, gap: 18 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        color: KitchenDesign.colors.ink,
        fontSize: 22,
        fontWeight: '900',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: KitchenDesign.colors.porcelain,
        borderColor: KitchenDesign.colors.border,
        borderWidth: 1,
    },
    smallIconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: KitchenDesign.colors.porcelain,
        borderColor: KitchenDesign.colors.border,
        borderWidth: 1,
    },
    fieldGroup: { gap: 6 },
    label: {
        color: KitchenDesign.colors.muted,
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        minHeight: 48,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: KitchenDesign.colors.ink,
        fontSize: 16,
        backgroundColor: KitchenDesign.colors.porcelain,
        borderColor: KitchenDesign.colors.border,
        borderWidth: 1,
    },
    multiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    section: {
        borderRadius: 18,
        padding: 16,
        gap: 12,
        backgroundColor: KitchenDesign.colors.porcelain,
        borderColor: KitchenDesign.colors.border,
        borderWidth: 1,
    },
    sectionTitle: {
        color: KitchenDesign.colors.ink,
        fontSize: 19,
        fontWeight: '900',
    },
    ingredientRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    stepRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: KitchenDesign.colors.orange,
        marginTop: 8,
    },
    stepBadgeText: {
        color: KitchenDesign.colors.cream,
        fontSize: 13,
        fontWeight: '900',
    },
    addRowButton: {
        minHeight: 44,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: KitchenDesign.colors.linen,
    },
    addRowText: {
        color: KitchenDesign.colors.ink,
        fontSize: 15,
        fontWeight: '700',
    },
    saveButton: {
        minHeight: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: KitchenDesign.colors.orange,
    },
    saveButtonText: {
        color: KitchenDesign.colors.cream,
        fontSize: 17,
        fontWeight: '900',
    },
    errorText: {
        color: KitchenDesign.colors.danger,
        fontSize: 14,
        fontWeight: '700',
    },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    pressed: { opacity: 0.84 },
});
