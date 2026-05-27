/**
 * Entitlement types for the Family AI Kitchen monetization layer.
 *
 * Design decisions:
 * - Entitlements are server-authoritative via RevenueCat. The app caches
 *   the last-known state for offline display but MUST fail-closed: if the
 *   entitlement cannot be verified, premium actions are blocked.
 * - The app never stores RevenueCat webhook secrets or API keys in the bundle.
 *   Only the public SDK API key is used (configured at app init time).
 * - Free tier has usage limits for AI/scan features. Limits are enforced
 *   server-side; the client tracks local counts for UX only.
 */

// ---------------------------------------------------------------------------
// Product identifiers (must match RevenueCat dashboard)
// ---------------------------------------------------------------------------

export const PRODUCT_IDS = {
  /** Monthly premium subscription */
  PREMIUM_MONTHLY: 'fak_premium_monthly',
  /** Annual premium subscription */
  PREMIUM_ANNUAL: 'fak_premium_annual',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];

// ---------------------------------------------------------------------------
// Entitlement identifiers (must match RevenueCat entitlement config)
// ---------------------------------------------------------------------------

export const ENTITLEMENT_IDS = {
  /** Full premium access — unlocks all AI, scan, and meal plan features */
  PREMIUM: 'premium',
} as const;

export type EntitlementId = (typeof ENTITLEMENT_IDS)[keyof typeof ENTITLEMENT_IDS];

// ---------------------------------------------------------------------------
// Entitlement state
// ---------------------------------------------------------------------------

export type EntitlementStatus = 'active' | 'expired' | 'none';

export type EntitlementState = {
  /** Whether the user currently has premium access */
  isPremium: boolean;
  /** Detailed status of the premium entitlement */
  status: EntitlementStatus;
  /** ISO date when the current period expires (null if no subscription) */
  expiresAt: string | null;
  /** Whether the subscription will auto-renew */
  willRenew: boolean;
  /** The product that granted the entitlement (null if none) */
  activeProductId: ProductId | null;
  /** Timestamp of last successful verification */
  lastVerifiedAt: string | null;
};

export const DEFAULT_ENTITLEMENT_STATE: EntitlementState = {
  isPremium: false,
  status: 'none',
  expiresAt: null,
  willRenew: false,
  activeProductId: null,
  lastVerifiedAt: null,
};

// ---------------------------------------------------------------------------
// Free-tier usage limits
// ---------------------------------------------------------------------------

export type UsageLimits = {
  /** Max AI suggestions per day for free users */
  aiSuggestionsPerDay: number;
  /** Max scans per day for free users */
  scansPerDay: number;
  /** Max AI meal plans per week for free users */
  aiMealPlansPerWeek: number;
};

export const FREE_TIER_LIMITS: UsageLimits = {
  aiSuggestionsPerDay: 3,
  scansPerDay: 2,
  aiMealPlansPerWeek: 1,
};

// ---------------------------------------------------------------------------
// Usage tracking (local-only, for UX display)
// ---------------------------------------------------------------------------

export type UsageCounter = {
  aiSuggestionsToday: number;
  scansToday: number;
  aiMealPlansThisWeek: number;
  /** ISO date string of the day these counters apply to */
  counterDate: string;
  /** ISO week string (YYYY-Www) for weekly counters */
  counterWeek: string;
};

export const EMPTY_USAGE: UsageCounter = {
  aiSuggestionsToday: 0,
  scansToday: 0,
  aiMealPlansThisWeek: 0,
  counterDate: '',
  counterWeek: '',
};
