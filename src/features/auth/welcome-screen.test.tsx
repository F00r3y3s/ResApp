import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { WelcomeScreenContent } from './welcome-screen';

const mockRouterCalls: { method: string; path: string }[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (path: string) => mockRouterCalls.push({ method: 'push', path }),
    replace: (path: string) => mockRouterCalls.push({ method: 'replace', path }),
  },
}));

describe('WelcomeScreenContent', () => {
  beforeEach(() => {
    mockRouterCalls.length = 0;
  });

  it('renders the app name, tagline, and auth options', () => {
    render(<WelcomeScreenContent />);

    expect(screen.getByText('Family AI Kitchen')).toBeTruthy();
    expect(screen.getByText(/Cook smarter together/)).toBeTruthy();
    expect(screen.getByText('Continue with email')).toBeTruthy();
    expect(screen.getByText('Continue as guest')).toBeTruthy();
  });

  it('navigates to login when email button is pressed', () => {
    render(<WelcomeScreenContent />);

    fireEvent.press(screen.getByText('Continue with email'));

    expect(mockRouterCalls).toContainEqual({ method: 'push', path: '/login' });
  });

  it('navigates to guest home when skip is pressed', () => {
    render(<WelcomeScreenContent />);

    fireEvent.press(screen.getByText('Continue as guest'));

    expect(mockRouterCalls).toContainEqual({ method: 'replace', path: '/' });
  });

  it('shows privacy text', () => {
    render(<WelcomeScreenContent />);

    expect(screen.getByText(/Your data stays on your device/)).toBeTruthy();
  });
});
