import type { GroceryItem } from './grocery-repository';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const GROCERY_SECTIONS = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Spices',
  'Pantry',
  'Frozen',
  'Beverages',
  'Other',
] as const;

export type GrocerySection = (typeof GROCERY_SECTIONS)[number];

// ---------------------------------------------------------------------------
// Section inference — keyword-based classifier
// ---------------------------------------------------------------------------

type SectionRule = {
  section: GrocerySection;
  keywords: string[];
};

// Rules are ordered by specificity — more specific qualifiers (frozen, beverages)
// must come before broad categories (produce) to avoid false matches.
const SECTION_RULES: SectionRule[] = [
  {
    section: 'Frozen',
    keywords: [
      'frozen', 'ice cream', 'gelato', 'sorbet', 'popsicle',
    ],
  },
  {
    section: 'Beverages',
    keywords: [
      'juice', 'coffee', 'tea', 'soda', 'water', 'sparkling',
      'kombucha', 'smoothie', 'lemonade', 'beer', 'wine', 'spirit',
      'energy drink', 'sports drink', 'almond milk', 'oat milk',
      'soy milk',
    ],
  },
  {
    section: 'Dairy',
    keywords: [
      'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'curd',
      'paneer', 'ghee', 'whey', 'kefir', 'sour cream', 'mozzarella',
      'parmesan', 'cheddar', 'ricotta', 'feta', 'brie', 'gouda',
      'cream cheese', 'half and half', 'buttermilk',
    ],
  },
  {
    section: 'Meat & Seafood',
    keywords: [
      'chicken', 'beef', 'lamb', 'pork', 'turkey', 'duck', 'veal',
      'salmon', 'tuna', 'shrimp', 'prawn', 'fish', 'cod', 'tilapia',
      'crab', 'lobster', 'mussels', 'clams', 'oyster', 'squid',
      'sausage', 'bacon', 'ham', 'steak', 'mince', 'ground meat',
      'fillet', 'drumstick', 'thigh', 'wing', 'ribs',
    ],
  },
  {
    section: 'Bakery',
    keywords: [
      'bread', 'baguette', 'croissant', 'muffin', 'bagel', 'roll',
      'pita', 'naan', 'tortilla', 'wrap', 'flatbread', 'sourdough',
      'brioche', 'ciabatta', 'focaccia', 'cake', 'pastry', 'donut',
      'doughnut', 'bun',
    ],
  },
  {
    section: 'Spices',
    keywords: [
      'cumin', 'cinnamon', 'turmeric', 'paprika', 'chili powder',
      'cayenne', 'nutmeg', 'clove', 'cardamom', 'coriander', 'oregano',
      'bay leaf', 'saffron', 'allspice', 'fennel seed',
      'mustard seed', 'star anise', 'garam masala', 'curry powder',
      'smoked paprika', 'black pepper', 'white pepper', 'dried', 'ground',
    ],
  },
  {
    section: 'Pantry',
    keywords: [
      'oil', 'olive oil', 'vegetable oil', 'coconut oil', 'sesame oil',
      'vinegar', 'soy sauce', 'fish sauce', 'hot sauce', 'ketchup',
      'mustard', 'mayonnaise', 'flour', 'sugar', 'salt', 'baking soda',
      'baking powder', 'yeast', 'cornstarch', 'rice', 'pasta', 'noodle',
      'lentil', 'chickpea', 'canned', 'broth', 'stock',
      'tomato paste', 'tomato sauce', 'coconut milk', 'honey', 'maple syrup',
      'jam', 'peanut butter', 'almond butter', 'tahini', 'oat', 'cereal',
      'granola', 'cracker', 'chip', 'almond', 'walnut', 'cashew', 'peanut',
      'seed', 'raisin', 'dried fruit', 'chocolate', 'cocoa',
    ],
  },
  {
    section: 'Produce',
    keywords: [
      'tomato', 'tomatoes', 'onion', 'garlic', 'ginger', 'potato',
      'carrot', 'celery', 'spinach', 'kale', 'lettuce', 'cucumber',
      'pepper', 'bell pepper', 'jalapeño', 'chili', 'broccoli',
      'cauliflower', 'zucchini', 'squash', 'eggplant', 'aubergine',
      'mushroom', 'corn', 'peas', 'beans', 'green beans',
      'avocado', 'lemon', 'lime', 'orange', 'apple', 'banana',
      'mango', 'pineapple', 'strawberry', 'blueberry', 'raspberry',
      'grape', 'watermelon', 'peach', 'pear', 'plum', 'cherry',
      'coconut', 'cabbage', 'radish', 'beet', 'turnip', 'leek',
      'scallion', 'spring onion', 'shallot', 'asparagus', 'artichoke',
      'fennel', 'parsley', 'cilantro', 'basil', 'mint', 'dill',
      'rosemary', 'thyme', 'fresh',
    ],
  },
];

/**
 * Infer the store section for a given ingredient name using keyword matching.
 * Returns 'Other' if no match is found.
 */
export function inferSection(ingredientName: string): GrocerySection {
  const lower = ingredientName.toLocaleLowerCase().trim();

  for (const rule of SECTION_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        return rule.section;
      }
    }
  }

  return 'Other';
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Group grocery items by store section.
 *
 * - Uses item.section if set, otherwise infers via `inferSection`.
 * - Within each section, unchecked items come first (by createdAt), then checked.
 * - Sections are ordered per GROCERY_SECTIONS; empty sections are omitted.
 */
export function groupItemsBySection(
  items: GroceryItem[],
): Map<string, GroceryItem[]> {
  const buckets = new Map<string, GroceryItem[]>();

  for (const item of items) {
    const section = item.section || inferSection(item.name);
    const bucket = buckets.get(section) ?? [];
    bucket.push(item);
    buckets.set(section, bucket);
  }

  // Sort within each bucket: unchecked first, then by createdAt
  for (const [key, bucket] of buckets) {
    buckets.set(
      key,
      bucket.sort((a, b) => {
        if (a.isChecked !== b.isChecked) return a.isChecked ? 1 : -1;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    );
  }

  // Return in GROCERY_SECTIONS order, omitting empty sections
  const ordered = new Map<string, GroceryItem[]>();
  for (const section of GROCERY_SECTIONS) {
    const bucket = buckets.get(section);
    if (bucket && bucket.length > 0) {
      ordered.set(section, bucket);
    }
  }

  return ordered;
}
