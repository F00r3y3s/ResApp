import { describe, expect, it } from '@jest/globals';

import { getBlockedReleaseGateIds, releaseGates } from './app-store-gates';

describe('App Store release gates', () => {
  it('tracks every App Store approval item as a release gate', () => {
    expect(releaseGates).toHaveLength(18);
    expect(releaseGates.map((gate) => gate.id)).toEqual([
      'secrets-no-service-keys',
      'secrets-no-private-api-keys',
      'guideline-252-no-code-execution',
      'guideline-252-eas-static-build',
      'offline-stress-test',
      'no-ai-leftovers',
      'modular-code-structure',
      'ai-consent',
      'privacy-policy-in-app',
      'ai-data-disclaimer',
      'delete-account',
      'native-iap-only',
      'restore-purchases',
      'latest-apple-sdk',
      'privacy-manifests',
      'tap-targets-44',
      'demo-review-account',
      'reviewer-screen-recording',
    ]);
  });

  it('blocks release when a required gate is not done', () => {
    const blocked = getBlockedReleaseGateIds([
      { id: 'secrets-no-service-keys', status: 'done' },
      { id: 'ai-consent', status: 'blocked' },
      { id: 'restore-purchases', status: 'pending' },
    ]);

    expect(blocked).toEqual(['ai-consent', 'restore-purchases']);
  });
});
