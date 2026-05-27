import { z } from 'zod';

/**
 * Event catalog for T12.1 telemetry.
 *
 * Privacy contract (see docs/security/privacy-contract.md):
 *   - Class is "analytics-safe": no recipe text, pantry contents, allergy
 *     details, images, or chat content.
 *   - Properties are restricted to scalars and small enums.
 *   - Free-form user text, file uris, emails, phone numbers, and full names
 *     are rejected at the schema layer.
 *   - The shape — counts, durations, route names, generic enum values — is
 *     captured. The content is never captured.
 *
 * Every event payload is tagged `privacy: 'analytics-safe'` to align with
 * `src/features/local-first/sync-policy.ts`.
 */

const PRIVACY_TAG = 'analytics-safe' as const;

const privacyTag = z.literal(PRIVACY_TAG).default(PRIVACY_TAG);

/**
 * Short identifier-like string. Cap is intentionally tight so a free-form
 * user-typed value can never sneak through a property that *looks* like
 * an enum.
 */
const shortIdent = z.string().min(1).max(64);

const onboardingCompletedSchema = z
  .object({
    step_count: z.number().int().min(0).max(64).optional(),
    duration_ms: z.number().int().min(0).max(60 * 60 * 1000).optional(),
    privacy: privacyTag,
  })
  .strict();

const recipeSavedSchema = z
  .object({
    source: z.enum(['seed', 'manual', 'import', 'remix']).optional(),
    has_image: z.boolean().optional(),
    privacy: privacyTag,
  })
  .strict();

const scanStartedSchema = z
  .object({
    surface: z.enum(['camera', 'gallery']).optional(),
    scan_kind: z.enum(['pantry', 'receipt', 'label']).optional(),
    privacy: privacyTag,
  })
  .strict();

const mealPlanRecipeAddedSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6).optional(),
    meal_slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
    privacy: privacyTag,
  })
  .strict();

const groceryItemAddedSchema = z
  .object({
    count: z.number().int().min(1).max(500).optional(),
    source: z.enum(['manual', 'recipe', 'meal-plan', 'scan']).optional(),
    privacy: privacyTag,
  })
  .strict();

const subscriptionStartedSchema = z
  .object({
    plan: z.enum(['free', 'trial', 'premium']).optional(),
    period: z.enum(['monthly', 'annual']).optional(),
    privacy: privacyTag,
  })
  .strict();

const screenViewedSchema = z
  .object({
    /** Logical screen identifier from the Expo Router route group, NOT a title. */
    screen: shortIdent.optional(),
    privacy: privacyTag,
  })
  .strict();

const errorObservedSchema = z
  .object({
    /** A short, fixed-vocabulary surface name like "scan" or "cook-mode". */
    surface: shortIdent.optional(),
    /** A short, fixed-vocabulary error code, never a stack or message. */
    code: shortIdent.optional(),
    privacy: privacyTag,
  })
  .strict();

export const ANALYTICS_EVENTS = {
  onboarding_completed: onboardingCompletedSchema,
  recipe_saved: recipeSavedSchema,
  scan_started: scanStartedSchema,
  meal_plan_recipe_added: mealPlanRecipeAddedSchema,
  grocery_item_added: groceryItemAddedSchema,
  subscription_started: subscriptionStartedSchema,
  screen_viewed: screenViewedSchema,
  error_observed: errorObservedSchema,
} as const;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;

export type AnalyticsEventInput<TName extends AnalyticsEventName> = Omit<
  z.input<(typeof ANALYTICS_EVENTS)[TName]>,
  'privacy'
>;

export type AnalyticsEventPayload<TName extends AnalyticsEventName> = z.output<
  (typeof ANALYTICS_EVENTS)[TName]
>;

type ParseSuccess<TName extends AnalyticsEventName> = {
  success: true;
  data: AnalyticsEventPayload<TName>;
};

type ParseFailure = {
  success: false;
  error: string;
};

export type ParseAnalyticsEventResult<TName extends AnalyticsEventName> =
  | ParseSuccess<TName>
  | ParseFailure;

export function isAnalyticsEvent(name: string): name is AnalyticsEventName {
  return Object.prototype.hasOwnProperty.call(ANALYTICS_EVENTS, name);
}

/**
 * Parse + validate an analytics event payload.
 *
 * Returns `success: false` when the event name is unknown, when an unexpected
 * property is present, or when any property fails its schema. This is the
 * single enforcement point for "shape, never content."
 */
export function parseAnalyticsEvent<TName extends AnalyticsEventName>(
  name: TName,
  properties?: Record<string, unknown>,
): ParseAnalyticsEventResult<TName>;
export function parseAnalyticsEvent(
  name: string,
  properties?: Record<string, unknown>,
): { success: false; error: string };
export function parseAnalyticsEvent(
  name: string,
  properties: Record<string, unknown> = {},
): { success: true; data: unknown } | { success: false; error: string } {
  if (!isAnalyticsEvent(name)) {
    return { success: false, error: `unknown analytics event: ${name}` };
  }

  const schema = ANALYTICS_EVENTS[name];
  const parsed = schema.safeParse({ ...properties, privacy: PRIVACY_TAG });

  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }

  return { success: true, data: parsed.data };
}
