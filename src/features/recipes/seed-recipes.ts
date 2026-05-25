/**
 * Seed recipe catalog — owned / permissive content only.
 * Attribution metadata must be preserved in every copy or remix.
 */

export type SeedIngredient = {
  name: string;
  quantity: string;
  unit: string;
};

export type SeedStep = {
  order: number;
  instruction: string;
  timerMinutes?: number;
};

export type SeedRecipe = {
  id: string;
  title: string;
  cuisine: string;
  dietTags: string[];
  allergens: string[];
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  ingredients: SeedIngredient[];
  steps: SeedStep[];
  /** Relative require() asset path — resolved by Metro at build time */
  imageKey: string | null;
  source: string;
  attribution: string;
  license: string;
};

export const SEED_RECIPES: SeedRecipe[] = [
  {
    id: 'seed-001',
    title: 'Family Lentil Soup',
    cuisine: 'levantine',
    dietTags: ['vegan', 'vegetarian', 'halal'],
    allergens: [],
    prepMinutes: 10,
    cookMinutes: 30,
    servings: 4,
    ingredients: [
      { name: 'Red lentils', quantity: '1.5', unit: 'cups' },
      { name: 'Onion', quantity: '1', unit: 'large' },
      { name: 'Garlic', quantity: '3', unit: 'cloves' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Turmeric', quantity: '0.5', unit: 'tsp' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Vegetable stock', quantity: '1', unit: 'litre' },
      { name: 'Lemon', quantity: '1', unit: 'whole' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      { order: 1, instruction: 'Dice onion and mince garlic.' },
      { order: 2, instruction: 'Heat olive oil in a large pot over medium heat. Sauté onion until golden, about 5 minutes.' },
      { order: 3, instruction: 'Add garlic, cumin, and turmeric. Stir for 1 minute until fragrant.' },
      { order: 4, instruction: 'Add rinsed lentils and vegetable stock. Bring to a boil.', timerMinutes: 5 },
      { order: 5, instruction: 'Reduce heat, cover, and simmer for 20 minutes until lentils are soft.', timerMinutes: 20 },
      { order: 6, instruction: 'Blend half the soup for a creamy texture, or leave chunky.' },
      { order: 7, instruction: 'Season with salt, squeeze in lemon juice, and serve hot.' },
    ],
    imageKey: null,
    source: 'Family AI Kitchen Originals',
    attribution: 'Family AI Kitchen — original recipe, freely reusable',
    license: 'CC0',
  },
  {
    id: 'seed-002',
    title: 'Lemon Herb Chicken Traybake',
    cuisine: 'british',
    dietTags: ['halal'],
    allergens: [],
    prepMinutes: 15,
    cookMinutes: 45,
    servings: 4,
    ingredients: [
      { name: 'Chicken thighs', quantity: '8', unit: 'pieces' },
      { name: 'Baby potatoes', quantity: '500', unit: 'g' },
      { name: 'Cherry tomatoes', quantity: '250', unit: 'g' },
      { name: 'Lemon', quantity: '2', unit: 'whole' },
      { name: 'Garlic', quantity: '4', unit: 'cloves' },
      { name: 'Olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'Dried thyme', quantity: '1', unit: 'tsp' },
      { name: 'Dried rosemary', quantity: '1', unit: 'tsp' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
      { name: 'Black pepper', quantity: '0.5', unit: 'tsp' },
    ],
    steps: [
      { order: 1, instruction: 'Preheat oven to 200°C / 180°C fan / 400°F.', timerMinutes: 10 },
      { order: 2, instruction: 'Halve potatoes and place in a large roasting tray with cherry tomatoes and garlic.' },
      { order: 3, instruction: 'Drizzle with olive oil, season with salt, pepper, thyme, and rosemary. Toss to coat.' },
      { order: 4, instruction: 'Nestle chicken thighs on top, skin-side up. Squeeze lemon juice over everything and add lemon halves to tray.' },
      { order: 5, instruction: 'Roast for 45 minutes until chicken is golden and juices run clear.', timerMinutes: 45 },
      { order: 6, instruction: 'Rest for 5 minutes before serving.' },
    ],
    imageKey: null,
    source: 'Family AI Kitchen Originals',
    attribution: 'Family AI Kitchen — original recipe, freely reusable',
    license: 'CC0',
  },
  {
    id: 'seed-003',
    title: 'Tomato Rice Skillet',
    cuisine: 'indian',
    dietTags: ['vegan', 'vegetarian', 'halal'],
    allergens: [],
    prepMinutes: 5,
    cookMinutes: 25,
    servings: 4,
    ingredients: [
      { name: 'Basmati rice', quantity: '1.5', unit: 'cups' },
      { name: 'Tinned chopped tomatoes', quantity: '400', unit: 'g' },
      { name: 'Onion', quantity: '1', unit: 'medium' },
      { name: 'Garlic', quantity: '2', unit: 'cloves' },
      { name: 'Cumin seeds', quantity: '1', unit: 'tsp' },
      { name: 'Garam masala', quantity: '0.5', unit: 'tsp' },
      { name: 'Vegetable stock', quantity: '500', unit: 'ml' },
      { name: 'Frozen peas', quantity: '1', unit: 'cup' },
      { name: 'Olive oil', quantity: '2', unit: 'tbsp' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      { order: 1, instruction: 'Rinse rice until water runs clear.' },
      { order: 2, instruction: 'Heat oil in a wide skillet or pan over medium heat. Add cumin seeds and sizzle for 30 seconds.' },
      { order: 3, instruction: 'Add diced onion and sauté until softened, about 5 minutes.' },
      { order: 4, instruction: 'Add minced garlic and garam masala. Stir for 1 minute.' },
      { order: 5, instruction: 'Add rice and stir to coat in the spiced oil for 1 minute.' },
      { order: 6, instruction: 'Pour in tinned tomatoes and vegetable stock. Season with salt. Bring to a boil.' },
      { order: 7, instruction: 'Reduce heat, cover, and simmer for 15 minutes.', timerMinutes: 15 },
      { order: 8, instruction: 'Stir in frozen peas, cover, and cook for 3 more minutes until rice is done.', timerMinutes: 3 },
      { order: 9, instruction: 'Fluff with a fork and serve.' },
    ],
    imageKey: null,
    source: 'Family AI Kitchen Originals',
    attribution: 'Family AI Kitchen — original recipe, freely reusable',
    license: 'CC0',
  },
  {
    id: 'seed-004',
    title: 'Chickpea and Spinach Curry',
    cuisine: 'indian',
    dietTags: ['vegan', 'vegetarian', 'halal', 'gluten-free'],
    allergens: [],
    prepMinutes: 10,
    cookMinutes: 25,
    servings: 4,
    ingredients: [
      { name: 'Tinned chickpeas', quantity: '800', unit: 'g' },
      { name: 'Fresh spinach', quantity: '200', unit: 'g' },
      { name: 'Tinned chopped tomatoes', quantity: '400', unit: 'g' },
      { name: 'Onion', quantity: '1', unit: 'large' },
      { name: 'Garlic', quantity: '3', unit: 'cloves' },
      { name: 'Fresh ginger', quantity: '1', unit: 'tsp' },
      { name: 'Cumin', quantity: '1', unit: 'tsp' },
      { name: 'Coriander powder', quantity: '1', unit: 'tsp' },
      { name: 'Turmeric', quantity: '0.5', unit: 'tsp' },
      { name: 'Garam masala', quantity: '1', unit: 'tsp' },
      { name: 'Coconut milk', quantity: '200', unit: 'ml' },
      { name: 'Vegetable oil', quantity: '2', unit: 'tbsp' },
      { name: 'Salt', quantity: '1', unit: 'tsp' },
    ],
    steps: [
      { order: 1, instruction: 'Heat oil in a large pan. Fry diced onion until golden, about 7 minutes.' },
      { order: 2, instruction: 'Add garlic, ginger, and all dry spices. Stir for 1 minute.' },
      { order: 3, instruction: 'Add tinned tomatoes. Cook for 5 minutes until sauce thickens.' },
      { order: 4, instruction: 'Drain and rinse chickpeas, then add to the pan along with coconut milk.' },
      { order: 5, instruction: 'Simmer for 10 minutes.', timerMinutes: 10 },
      { order: 6, instruction: 'Stir in spinach and cook until wilted, about 2 minutes.', timerMinutes: 2 },
      { order: 7, instruction: 'Season with salt and serve with rice or bread.' },
    ],
    imageKey: null,
    source: 'Family AI Kitchen Originals',
    attribution: 'Family AI Kitchen — original recipe, freely reusable',
    license: 'CC0',
  },
  {
    id: 'seed-005',
    title: 'Turkish Eggs (Çılbır)',
    cuisine: 'turkish',
    dietTags: ['vegetarian'],
    allergens: ['eggs', 'dairy'],
    prepMinutes: 5,
    cookMinutes: 10,
    servings: 2,
    ingredients: [
      { name: 'Eggs', quantity: '4', unit: 'whole' },
      { name: 'Greek yogurt', quantity: '200', unit: 'g' },
      { name: 'Garlic', quantity: '1', unit: 'clove' },
      { name: 'Butter', quantity: '2', unit: 'tbsp' },
      { name: 'Paprika', quantity: '1', unit: 'tsp' },
      { name: 'Chilli flakes', quantity: '0.5', unit: 'tsp' },
      { name: 'White vinegar', quantity: '1', unit: 'tbsp' },
      { name: 'Salt', quantity: '0.5', unit: 'tsp' },
      { name: 'Fresh dill', quantity: '1', unit: 'tbsp' },
    ],
    steps: [
      { order: 1, instruction: 'Mix yogurt with crushed garlic and a pinch of salt. Spread on serving plates and bring to room temperature.' },
      { order: 2, instruction: 'Bring a wide pan of water to a gentle simmer. Add vinegar.' },
      { order: 3, instruction: 'Crack each egg into a cup, swirl the water, and slide egg in. Poach for 3 minutes.', timerMinutes: 3 },
      { order: 4, instruction: 'Melt butter in a small pan. Add paprika and chilli flakes. Stir for 30 seconds until fragrant.' },
      { order: 5, instruction: 'Place poached eggs on yogurt. Drizzle spiced butter over eggs.' },
      { order: 6, instruction: 'Garnish with fresh dill and serve immediately with crusty bread.' },
    ],
    imageKey: null,
    source: 'Family AI Kitchen Originals',
    attribution: 'Family AI Kitchen — original recipe, freely reusable',
    license: 'CC0',
  },
];

export function getSeedRecipeById(id: string): SeedRecipe | null {
  return SEED_RECIPES.find((r) => r.id === id) ?? null;
}
