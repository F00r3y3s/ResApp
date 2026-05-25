/**
 * Detected pantry item from an AI scan-parse call.
 *
 * The AI gateway returns a structured response listing items it found in the
 * image, with confidence scores and best-effort metadata (quantity, unit,
 * location, expiry). The user confirms each item before it lands in the
 * pantry repository (T8.2 acceptance: "User must confirm before saving").
 */
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
 */
export function parseDetectedItems(response: ScanParseResponse): DetectedItem[] {
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
