/**
 * Local ingredient substitution table.
 *
 * Free Smart Chef Lite uses this for offline substitution lookups.
 * Premium AI can also use it as a guardrail to filter unsafe AI suggestions.
 *
 * Each entry maps a canonical ingredient name (lowercase) to an array of
 * substitutes. Each substitute carries its own allergen tags so we can filter
 * unsafe options for users with allergies.
 *
 * Allergen tags use the same canonical set as user preferences:
 *   peanuts, tree-nuts, dairy, eggs, seafood, gluten, soy
 */

export type Substitute = {
  /** Canonical lowercase name of the substitute. */
  name: string;
  /** Notes shown to the user (ratio, cooking adjustment, etc.). */
  note: string;
  /** Allergen tags this substitute contains. Used for guardrails. */
  allergens: string[];
};

export type SubstitutionEntry = {
  /** Canonical lowercase name of the ingredient being substituted. */
  ingredient: string;
  /** Substitutes ordered from best to acceptable. */
  substitutes: Substitute[];
};

/**
 * Curated substitution table.
 * Sources:
 * - Common kitchen substitutions
 * - Allergy-conscious substitution patterns
 *
 * Keep entries lowercase and singular where possible. Lookup is normalized.
 */
export const SUBSTITUTION_TABLE: SubstitutionEntry[] = [
  {
    ingredient: 'butter',
    substitutes: [
      { name: 'olive oil', note: 'Use 3/4 the amount of butter', allergens: [] },
      { name: 'coconut oil', note: '1:1 ratio, melt first', allergens: [] },
      { name: 'ghee', note: '1:1 ratio for cooking', allergens: ['dairy'] },
      { name: 'unsweetened applesauce', note: '1:1 in baking, reduces fat', allergens: [] },
    ],
  },
  {
    ingredient: 'milk',
    substitutes: [
      { name: 'oat milk', note: '1:1 ratio, neutral flavor', allergens: [] },
      { name: 'almond milk', note: '1:1 ratio, slight nutty flavor', allergens: ['tree-nuts'] },
      { name: 'soy milk', note: '1:1 ratio, creamy', allergens: ['soy'] },
      { name: 'coconut milk', note: '1:1 ratio, adds richness', allergens: [] },
    ],
  },
  {
    ingredient: 'eggs',
    substitutes: [
      { name: 'flax egg', note: '1 tbsp ground flax + 3 tbsp water per egg', allergens: [] },
      { name: 'chia egg', note: '1 tbsp chia seeds + 3 tbsp water per egg', allergens: [] },
      { name: 'mashed banana', note: '1/4 cup per egg, adds sweetness', allergens: [] },
      { name: 'unsweetened applesauce', note: '1/4 cup per egg in baking', allergens: [] },
      { name: 'silken tofu', note: '1/4 cup blended per egg', allergens: ['soy'] },
    ],
  },
  {
    ingredient: 'yogurt',
    substitutes: [
      { name: 'coconut yogurt', note: '1:1 ratio, dairy-free', allergens: [] },
      { name: 'sour cream', note: '1:1 ratio in cooking', allergens: ['dairy'] },
      { name: 'silken tofu', note: 'Blend until smooth, 1:1 ratio', allergens: ['soy'] },
    ],
  },
  {
    ingredient: 'sour cream',
    substitutes: [
      { name: 'greek yogurt', note: '1:1 ratio, similar tang', allergens: ['dairy'] },
      { name: 'coconut yogurt', note: '1:1 ratio, dairy-free', allergens: [] },
      { name: 'cashew cream', note: 'Soak cashews and blend', allergens: ['tree-nuts'] },
    ],
  },
  {
    ingredient: 'heavy cream',
    substitutes: [
      { name: 'coconut cream', note: '1:1 ratio, slight coconut flavor', allergens: [] },
      { name: 'cashew cream', note: 'Soak cashews and blend with water', allergens: ['tree-nuts'] },
      { name: 'oat cream', note: '1:1 ratio, neutral', allergens: [] },
    ],
  },
  {
    ingredient: 'flour',
    substitutes: [
      { name: 'almond flour', note: '1:1 in most recipes, denser texture', allergens: ['tree-nuts'] },
      { name: 'oat flour', note: '1:1 ratio, slightly coarser', allergens: [] },
      { name: 'rice flour', note: '1:1 in baking, crisper texture', allergens: [] },
      { name: 'gluten-free flour blend', note: '1:1 ratio', allergens: [] },
    ],
  },
  {
    ingredient: 'breadcrumbs',
    substitutes: [
      { name: 'rolled oats', note: 'Pulse in blender, 1:1 ratio', allergens: [] },
      { name: 'crushed nuts', note: 'For breading, allergen note', allergens: ['tree-nuts'] },
      { name: 'gluten-free panko', note: '1:1 ratio', allergens: [] },
    ],
  },
  {
    ingredient: 'soy sauce',
    substitutes: [
      { name: 'tamari', note: '1:1 ratio, gluten-free', allergens: ['soy'] },
      { name: 'coconut aminos', note: '1:1 ratio, soy-free', allergens: [] },
      { name: 'liquid aminos', note: '1:1 ratio, lower sodium', allergens: ['soy'] },
    ],
  },
  {
    ingredient: 'peanut butter',
    substitutes: [
      { name: 'almond butter', note: '1:1 ratio, nuttier', allergens: ['tree-nuts'] },
      { name: 'sunflower seed butter', note: '1:1 ratio, nut-free', allergens: [] },
      { name: 'tahini', note: '1:1 ratio, sesame flavor', allergens: [] },
    ],
  },
  {
    ingredient: 'honey',
    substitutes: [
      { name: 'maple syrup', note: '1:1 ratio, vegan-friendly', allergens: [] },
      { name: 'agave nectar', note: '3/4 the amount of honey', allergens: [] },
      { name: 'date syrup', note: '1:1 ratio, deeper flavor', allergens: [] },
    ],
  },
  {
    ingredient: 'sugar',
    substitutes: [
      { name: 'maple syrup', note: '3/4 cup per cup, reduce liquid', allergens: [] },
      { name: 'honey', note: '3/4 cup per cup, reduce liquid', allergens: [] },
      { name: 'coconut sugar', note: '1:1 ratio, deeper flavor', allergens: [] },
    ],
  },
  {
    ingredient: 'parmesan',
    substitutes: [
      { name: 'pecorino', note: '1:1 ratio, sharper', allergens: ['dairy'] },
      { name: 'nutritional yeast', note: '1:1 ratio, vegan, savory', allergens: [] },
      { name: 'cashew parmesan', note: 'Blend cashews + nutritional yeast', allergens: ['tree-nuts'] },
    ],
  },
  {
    ingredient: 'chicken stock',
    substitutes: [
      { name: 'vegetable stock', note: '1:1 ratio, vegetarian', allergens: [] },
      { name: 'mushroom broth', note: '1:1 ratio, umami-rich', allergens: [] },
      { name: 'beef stock', note: '1:1 ratio, deeper flavor', allergens: [] },
    ],
  },
  {
    ingredient: 'lemon juice',
    substitutes: [
      { name: 'lime juice', note: '1:1 ratio, sharper', allergens: [] },
      { name: 'white wine vinegar', note: '1:1 ratio, no citrus flavor', allergens: [] },
      { name: 'apple cider vinegar', note: '1/2 the amount, milder', allergens: [] },
    ],
  },
  {
    ingredient: 'fish sauce',
    substitutes: [
      { name: 'soy sauce', note: '1:1 ratio, less umami depth', allergens: ['soy'] },
      { name: 'miso paste', note: '1 tsp per tbsp fish sauce', allergens: ['soy'] },
      { name: 'coconut aminos', note: '1:1 ratio, allergen-friendly', allergens: [] },
    ],
  },
  {
    ingredient: 'shrimp',
    substitutes: [
      { name: 'firm tofu', note: 'Cube and pan-fry, vegan', allergens: ['soy'] },
      { name: 'mushrooms', note: 'King oyster mushrooms work well', allergens: [] },
      { name: 'jackfruit', note: 'Adds texture, neutral flavor', allergens: [] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export type SubstitutionResult = {
  /** True if the ingredient was found in the table. */
  found: boolean;
  /** The original ingredient name (normalized). */
  ingredient: string;
  /** Substitutes safe for the user's allergies. */
  safeSubstitutes: Substitute[];
  /** Substitutes blocked due to user allergies (with conflict reason). */
  blockedSubstitutes: Array<{ substitute: Substitute; conflictAllergens: string[] }>;
};

export type SubstitutionLookupOptions = {
  /** User's allergens (lowercase). Substitutes containing these are blocked. */
  userAllergens?: string[];
  /** Custom substitution table. Defaults to the curated table. */
  table?: SubstitutionEntry[];
};

/**
 * Look up substitutions for an ingredient.
 *
 * Returns safe substitutes (no allergen conflict with user) and blocked
 * substitutes (with the conflict reason). Always returns a result even if the
 * ingredient is not in the table — `found` indicates whether a match was hit.
 */
export function lookupSubstitutions(
  ingredient: string,
  options: SubstitutionLookupOptions = {},
): SubstitutionResult {
  const { userAllergens = [], table = SUBSTITUTION_TABLE } = options;
  const normalized = normalize(ingredient);
  const userAllergenSet = new Set(userAllergens.map((a) => normalize(a)));

  const entry = table.find((e) => normalize(e.ingredient) === normalized);

  if (!entry) {
    return {
      found: false,
      ingredient: normalized,
      safeSubstitutes: [],
      blockedSubstitutes: [],
    };
  }

  const safe: Substitute[] = [];
  const blocked: Array<{ substitute: Substitute; conflictAllergens: string[] }> = [];

  for (const sub of entry.substitutes) {
    const conflicts = sub.allergens.filter((a) => userAllergenSet.has(normalize(a)));
    if (conflicts.length > 0) {
      blocked.push({ substitute: sub, conflictAllergens: conflicts });
    } else {
      safe.push(sub);
    }
  }

  return {
    found: true,
    ingredient: normalized,
    safeSubstitutes: safe,
    blockedSubstitutes: blocked,
  };
}

// ---------------------------------------------------------------------------
// Allergen guardrail
// ---------------------------------------------------------------------------

export type AllergyConflict = {
  /** Name of the ingredient that triggers the allergy. */
  ingredient: string;
  /** Allergens triggered. */
  allergens: string[];
};

/**
 * Scans a list of ingredients for allergens that conflict with the user's
 * allergies. Used as a guardrail before suggesting AI-generated content.
 *
 * @param ingredients - List of ingredient names to check
 * @param userAllergens - User's allergens (lowercase)
 * @param allergenMap - Optional override; defaults to a built-in mapping
 */
export function detectAllergyConflicts(
  ingredients: string[],
  userAllergens: string[],
  allergenMap: Record<string, string[]> = INGREDIENT_ALLERGEN_MAP,
): AllergyConflict[] {
  if (userAllergens.length === 0) return [];

  const userAllergenSet = new Set(userAllergens.map((a) => normalize(a)));
  const conflicts: AllergyConflict[] = [];

  for (const ingredient of ingredients) {
    const normalized = normalize(ingredient);
    const allergens = findAllergensForIngredient(normalized, allergenMap);
    const triggered = allergens.filter((a) => userAllergenSet.has(normalize(a)));

    if (triggered.length > 0) {
      conflicts.push({ ingredient, allergens: triggered });
    }
  }

  return conflicts;
}

/**
 * Built-in mapping from ingredient keywords to allergen tags.
 * Lookup is substring-based to catch variations (e.g., "almond milk" → tree-nuts).
 */
const INGREDIENT_ALLERGEN_MAP: Record<string, string[]> = {
  // Tree nuts
  almond: ['tree-nuts'],
  cashew: ['tree-nuts'],
  walnut: ['tree-nuts'],
  pecan: ['tree-nuts'],
  pistachio: ['tree-nuts'],
  hazelnut: ['tree-nuts'],
  macadamia: ['tree-nuts'],
  // Peanuts
  peanut: ['peanuts'],
  // Dairy
  milk: ['dairy'],
  cheese: ['dairy'],
  butter: ['dairy'],
  yogurt: ['dairy'],
  cream: ['dairy'],
  parmesan: ['dairy'],
  pecorino: ['dairy'],
  ghee: ['dairy'],
  // Eggs
  egg: ['eggs'],
  // Seafood
  shrimp: ['seafood'],
  prawn: ['seafood'],
  fish: ['seafood'],
  salmon: ['seafood'],
  tuna: ['seafood'],
  cod: ['seafood'],
  shellfish: ['seafood'],
  crab: ['seafood'],
  lobster: ['seafood'],
  // Soy
  soy: ['soy'],
  tofu: ['soy'],
  tempeh: ['soy'],
  miso: ['soy'],
  // Gluten
  wheat: ['gluten'],
  flour: ['gluten'],
  bread: ['gluten'],
  pasta: ['gluten'],
  noodle: ['gluten'],
};

function findAllergensForIngredient(
  ingredient: string,
  allergenMap: Record<string, string[]>,
): string[] {
  const found = new Set<string>();
  for (const [keyword, allergens] of Object.entries(allergenMap)) {
    if (ingredient.includes(keyword)) {
      allergens.forEach((a) => found.add(a));
    }
  }
  return Array.from(found);
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
