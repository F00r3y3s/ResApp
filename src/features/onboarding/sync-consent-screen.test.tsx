import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { SyncConsentScreenContent } from './sync-consent-screen';

describe('SyncConsentScreenContent', () => {
  it('explains that local imports stay on device before account sync', () => {
    render(<SyncConsentScreenContent />);

    expect(screen.getByText('Sync consent')).toBeTruthy();
    expect(screen.getByText('Your pantry, recipes, and preferences stay on this phone first.')).toBeTruthy();
    expect(screen.getByText('Create account later')).toBeTruthy();
  });
});
