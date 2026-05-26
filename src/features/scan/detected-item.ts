import type { GroceryItemDraft } from '@/features/grocery/grocery-model';

/**
 * Detected pantry item from an AI scan-parse call.
 *
 * The AI gateway returns a structured response listing items it found in the
 * image, with confidence scores and best-effort metadata (quantity, unit,
 * location, expiry). The user confirms each item before it lands in the
 * pantry repository (T8.2 acceptance: "User must confirm before saving").
 *
 * For receipt scans (T8.3), each item also has a `destination` so the user
 * can route it to either pantry or grocery list.
 */
export type DetectedItemDestination = 'pantry' | 'grocery';

export type DetectedItem = {
  /** Stable client-side id for list editing. */
  id: string;
  /** Item name as detected. User can edit. */
  name: string;
  /** AI confidence score 0–1. Below LOW_CONFIDENCE_THRESHOLD shows a warning. */
  confidence: number;
  /** Best-effort quantity. User can edit. */
  quantity: string;
  /** Best-effort unit (e.g., "kg", "bag", "whole"). User can edit. */
  unit: string;
  /** Detected location: 'fridge' | 'freezer' | 'pantry'. User can edit. */
  location: string;
  /** Best-effort expiry date in YYYY-MM-DD. May be empty. User can edit. */
  expiresAt: string;
  /** True if the user has marked this item to be saved. Defaults to true. */
  isIncluded: boolean;
  /** Where to save this item. Defaults to 'pantry' for pantry-photo, 'grocery' for receipt. */
  destination: DetectedItemDestination;
};

/** Confidence below this threshold triggers the "low confidence" UI badge. */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Shape of the AI gateway scan-parse response for `pantry-photo` type.
 * The Edge Function (T7.2) returns this contract.
 */
export type ScanParseDetectedItem = {
  name: string;
  confidence: number;
  quantity?: string | number;
  unit?: string;
  location?: string;
  expiresAt?: string;
};

export type ScanParseResponse = {
  items: ScanParseDetectedItem[];
};

/**
 * Converts a raw scan-parse response from the AI gateway into editable
 * DetectedItem records for the review UI.
 *
 * Defensive: clamps confidence to [0, 1], normalizes optional fields, and
 * generates stable ids for FlatList keys.
 *
 * @param response - Raw AI gateway response
 * @param defaultDestination - Where items default to (pantry-photo → 'pantry', receipt → 'grocery')
 */
export function parseDetectedItems(
  response: ScanParseResponse,
  defaultDestination: DetectedItemDestination = 'pantry',
): DetectedItem[] {
  if (!response || !Array.isArray(response.items)) {
    return [];
  }

  return response.items.map((raw, index) => {
    const confidence = clampConfidence(raw.confidence);
    return {
      id: `detected-${index}-${Date.now()}`,
      name: typeof raw.name === 'string' ? raw.name.trim() : '',
      confidence,
      quantity: raw.quantity != null ? String(raw.quantity) : '1',
      unit: typeof raw.unit === 'string' ? raw.unit.trim() : '',
      location: normalizeLocation(raw.location),
      expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt.trim() : '',
      isIncluded: true,
      destination: defaultDestination,
    };
  });
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeLocation(value: unknown): string {
  if (typeof value !== 'string') return 'Pantry';
  const trimmed = value.trim();
  if (!trimmed) return 'Pantry';

  const lower = trimmed.toLocaleLowerCase();
  if (lower === 'fridge' || lower === 'refrigerator') return 'Fridge';
  if (lower === 'freezer') return 'Freezer';
  if (lower === 'pantry') return 'Pantry';

  // Capitalize first letter of unknown locations
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}


// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

export type DuplicateMatch = {
  detectedItemId: string;
  detectedName: string;
  /** localId of the existing pantry item that matches. */
  existingLocalId: string;
  existingName: string;
};

/**
 * Identifies items in `detectedItems` that already exist in the pantry list.
 * Match is by normalized name (lowercased, whitespace-collapsed).
 *
 * Used by T8.3 receipt scan to prompt the user to merge duplicates.
 */
export function detectPantryDuplicates(
  detectedItems: DetectedItem[],
  existingPantryItems: { localId: string; name: string; normalizedName: string }[],
): DuplicateMatch[] {
  const existingByNormalizedName = new Map<string, { localId: string; name: string }>();
  for (const existing of existingPantryItems) {
    existingByNormalizedName.set(existing.normalizedName, {
      localId: existing.localId,
      name: existing.name,
    });
  }

  const duplicates: DuplicateMatch[] = [];

  for (const detected of detectedItems) {
    if (!detected.isIncluded) continue;
    if (detected.destination !== 'pantry') continue;

    const normalized = detected.name.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    if (!normalized) continue;

    const match = existingByNormalizedName.get(normalized);
    if (match) {
      duplicates.push({
        detectedItemId: detected.id,
        detectedName: detected.name,
        existingLocalId: match.localId,
        existingName: match.name,
      });
    }
  }

  return duplicates;
}


// ---------------------------------------------------------------------------
// Grocery draft mapping
// ---------------------------------------------------------------------------

/**
 * Maps a `DetectedItem` to a `GroceryItemDraft` for use by the receipt-scan
 * flow when routing items to the grocery list.
 *
 * Used by T8.3: items the user marks as `destination: 'grocery'` are passed
 * through `groceryRepository.addMultipleToList(drafts)` after this mapping.
 *
 * Decisions:
 * - `name` is preserved verbatim so the user's edits in the confirm screen
 *   land in the grocery row exactly as typed. The grocery repo's
 *   `inferSection` reads `name` to assign a section.
 * - `normalizedName` collapses whitespace and lowercases so duplicate
 *   detection in the grocery repo works the same way it does for pantry.
 * - `quantity` and `unit` pass through verbatim (including empty strings)
 *   per the `GroceryItemDraft` contract — both are non-nullable `string`.
 * - `recipeId` and `recipeTitle` are always `null` because receipt-scan
 *   items have no source recipe.
 * - Expiry and location are intentionally dropped — they are not part of
 *   the `GroceryItemDraft` contract.
 *
 * Filtering by `isIncluded` and `destination` is the caller's responsibility;
 * this helper is a pure field mapping.
 */
export function detectedItemToGroceryDraft(item: DetectedItem): GroceryItemDraft {
  return {
    name: item.name,
    normalizedName: item.name.trim().toLocaleLowerCase().replace(/\s+/g, ' '),
    quantity: item.quantity,
    unit: item.unit,
    recipeId: null,
    recipeTitle: null,
  };
}
