import { column, Schema, Table } from '@powersync/react-native';

const pantryItems = new Table(
  {
    local_id: column.text,
    remote_id: column.text,
    household_id: column.text,
    name: column.text,
    normalized_name: column.text,
    quantity: column.real,
    unit: column.text,
    location: column.text,
    expires_at: column.text,
    privacy: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  {
    indexes: {
      pantry_location: ['location'],
      pantry_expiry: ['expires_at'],
    },
  },
);

const groceryItems = new Table(
  {
    local_id: column.text,
    remote_id: column.text,
    household_id: column.text,
    name: column.text,
    quantity: column.real,
    unit: column.text,
    section: column.text,
    assigned_to: column.text,
    checked_at: column.text,
    privacy: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  {
    indexes: {
      grocery_section: ['section'],
      grocery_checked: ['checked_at'],
    },
  },
);

const savedRecipes = new Table(
  {
    local_id: column.text,
    remote_id: column.text,
    owner_id: column.text,
    title: column.text,
    source: column.text,
    attribution: column.text,
    ingredients_json: column.text,
    steps_json: column.text,
    privacy: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  {
    indexes: {
      recipe_title: ['title'],
      recipe_owner: ['owner_id'],
    },
  },
);

const mealPlans = new Table(
  {
    local_id: column.text,
    remote_id: column.text,
    household_id: column.text,
    week_starts_on: column.text,
    plan_json: column.text,
    validation_json: column.text,
    privacy: column.text,
    created_at: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  {
    indexes: {
      meal_plan_week: ['week_starts_on'],
    },
  },
);

const guestPreferences = new Table(
  {
    local_id: column.text,
    language: column.text,
    region: column.text,
    household_size: column.integer,
    dietary_rules_json: column.text,
    allergies_json: column.text,
    cuisines_json: column.text,
    goals_json: column.text,
    privacy: column.text,
    updated_at: column.text,
    deleted_at: column.text,
  },
  {
    indexes: {
      guest_preferences_region: ['region'],
      guest_preferences_updated: ['updated_at'],
    },
  },
);

const syncQueue = new Table(
  {
    local_id: column.text,
    operation: column.text,
    table_name: column.text,
    payload_json: column.text,
    status: column.text,
    last_error: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      sync_queue_status: ['status'],
    },
  },
);

export const AppSchema = new Schema({
  pantry_items: pantryItems,
  grocery_items: groceryItems,
  saved_recipes: savedRecipes,
  meal_plans: mealPlans,
  guest_preferences: guestPreferences,
  sync_queue: syncQueue,
});

export type Database = (typeof AppSchema)['types'];
export type PantryItemRecord = Database['pantry_items'];
export type GroceryItemRecord = Database['grocery_items'];
export type SavedRecipeRecord = Database['saved_recipes'];
export type MealPlanRecord = Database['meal_plans'];
export type GuestPreferencesRecord = Database['guest_preferences'];
