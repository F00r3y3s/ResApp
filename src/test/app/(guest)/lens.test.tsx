/**
 * Co-located route test for the Lens tab (T8.3 task 13).
 *
 * Asserts the mode-pill entry points: tapping "Scan pantry" navigates to the
 * scan modal in pantry-photo mode and tapping "Scan receipt" navigates in
 * receipt mode. The route file itself stays focused on composition; the pills
 * live in `src/features/scan/scan-mode-pill-row.tsx`.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

const mockPush = jest.fn<(path: string) => void>();

jest.mock('expo-router', () => ({
  router: {
    push: (path: string) => mockPush(path),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

// Import the route AFTER the mock so the mocked module is picked up.
// eslint-disable-next-line import/first
import LensScreen from '../../../app/(guest)/lens';

describe('LensScreen — mode pill entry points (T8.3 task 13)', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('renders both Scan pantry and Scan receipt pills', () => {
    render(<LensScreen />);

    expect(screen.getByLabelText('Scan pantry')).toBeTruthy();
    expect(screen.getByLabelText('Scan receipt')).toBeTruthy();
  });

  it('pushes the receipt scan route when the receipt pill is tapped', () => {
    render(<LensScreen />);

    fireEvent.press(screen.getByLabelText('Scan receipt'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/scan?type=receipt');
  });

  it('pushes the pantry-photo scan route when the pantry pill is tapped', () => {
    render(<LensScreen />);

    fireEvent.press(screen.getByLabelText('Scan pantry'));

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toMatch(/^\/scan(\?type=pantry-photo)?$/);
  });
});
