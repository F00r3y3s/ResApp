export type RecordPrivacy = 'local-only' | 'syncable' | 'server-required' | 'analytics-safe';

export type SyncDecisionInput = {
  hasAccount: boolean;
  hasSyncConsent: boolean;
  recordPrivacy: RecordPrivacy;
};

export type DataBoundary =
  | 'local-only'
  | 'syncable-after-consent'
  | 'server-required'
  | 'analytics-safe';

const boundaries = {
  pantry_item: 'syncable-after-consent',
  grocery_item: 'syncable-after-consent',
  saved_recipe: 'syncable-after-consent',
  meal_plan: 'syncable-after-consent',
  cook_progress: 'syncable-after-consent',
  chat_history: 'syncable-after-consent',
  ai_photo_scan: 'server-required',
  ai_suggestion: 'server-required',
  ai_chat: 'server-required',
  ai_meal_plan: 'server-required',
  receipt_scan: 'server-required',
  nutrition_lookup: 'server-required',
  // T10.1 — circles must round-trip to Postgres so RLS can enforce membership.
  // Queueing them locally would let a guest create orphaned rows that never sync.
  circle: 'server-required',
  circle_member: 'server-required',
  analytics_event: 'analytics-safe',
  local_draft: 'local-only',
} as const;

export type BoundaryRecord = keyof typeof boundaries;

export function canSyncLocalRecord(input: SyncDecisionInput) {
  if (input.recordPrivacy !== 'syncable') {
    return false;
  }

  return input.hasAccount && input.hasSyncConsent;
}

export function getSyncBoundary(record: BoundaryRecord): DataBoundary {
  return boundaries[record];
}
