import { describe, expect, it } from '@jest/globals';

import { canSyncLocalRecord, getSyncBoundary } from './sync-policy';

describe('local-first sync policy', () => {
  it('keeps guest records local until account and explicit consent are present', () => {
    expect(
      canSyncLocalRecord({
        hasAccount: false,
        hasSyncConsent: true,
        recordPrivacy: 'syncable',
      }),
    ).toBe(false);

    expect(
      canSyncLocalRecord({
        hasAccount: true,
        hasSyncConsent: false,
        recordPrivacy: 'syncable',
      }),
    ).toBe(false);
  });

  it('never syncs records marked local-only', () => {
    expect(
      canSyncLocalRecord({
        hasAccount: true,
        hasSyncConsent: true,
        recordPrivacy: 'local-only',
      }),
    ).toBe(false);
  });

  it('names storage boundaries used in the privacy contract', () => {
    expect(getSyncBoundary('pantry_item')).toBe('syncable-after-consent');
    expect(getSyncBoundary('ai_photo_scan')).toBe('server-required');
    expect(getSyncBoundary('analytics_event')).toBe('analytics-safe');
  });
});
