import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { AuthService } from './auth-service';
import { LoginScreenContent } from './login-screen';

const mockRouterCalls: { method: string; path: string }[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (path: string) => mockRouterCalls.push({ method: 'push', path }),
    replace: (path: string) => mockRouterCalls.push({ method: 'replace', path }),
    back: () => mockRouterCalls.push({ method: 'back', path: '' }),
  },
}));

function createMockAuthService(overrides?: Partial<AuthService>): AuthService {
  return {
    signInWithOtp: jest.fn().mockResolvedValue({ success: true }) as any,
    verifyOtp: jest.fn().mockResolvedValue({
      success: true,
      session: { access_token: 'token' },
      user: { id: 'user-1' },
    }) as any,
    signInWithPassword: jest.fn().mockResolvedValue({
      success: true,
      session: { access_token: 'token' },
      user: { id: 'user-1' },
    }) as any,
    signUp: jest.fn().mockResolvedValue({
      success: true,
      session: { access_token: 'token' },
      user: { id: 'user-1' },
    }) as any,
    signOut: jest.fn() as any,
    getSession: jest.fn().mockResolvedValue(null) as any,
    onAuthStateChange: jest.fn().mockReturnValue(jest.fn()) as any,
    ...overrides,
  };
}

describe('LoginScreenContent', () => {
  beforeEach(() => {
    mockRouterCalls.length = 0;
  });

  it('renders the email input and magic link button', () => {
    render(<LoginScreenContent authService={createMockAuthService()} />);

    expect(screen.getByLabelText('Email address')).toBeTruthy();
    expect(screen.getByText('Send magic link')).toBeTruthy();
    expect(screen.getByText('Use password instead')).toBeTruthy();
  });

  it('sends OTP and shows verification code input', async () => {
    const service = createMockAuthService();
    render(<LoginScreenContent authService={service} />);

    fireEvent.changeText(screen.getByLabelText('Email address'), 'user@example.com');
    fireEvent.press(screen.getByText('Send magic link'));

    await waitFor(() => {
      expect(screen.getByText('Enter your code')).toBeTruthy();
      expect(screen.getByLabelText('Verification code')).toBeTruthy();
    });

    expect(service.signInWithOtp).toHaveBeenCalledWith('user@example.com');
  });

  it('verifies OTP and navigates to home on success', async () => {
    const service = createMockAuthService();
    render(<LoginScreenContent authService={service} />);

    fireEvent.changeText(screen.getByLabelText('Email address'), 'user@example.com');
    fireEvent.press(screen.getByText('Send magic link'));

    await waitFor(() => {
      expect(screen.getByLabelText('Verification code')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    fireEvent.press(screen.getByText('Verify code'));

    await waitFor(() => {
      expect(mockRouterCalls).toContainEqual({ method: 'replace', path: '/' });
    });

    expect(service.verifyOtp).toHaveBeenCalledWith('user@example.com', '123456');
  });

  it('shows error when OTP verification fails', async () => {
    const service = createMockAuthService({
      verifyOtp: jest.fn().mockResolvedValue({
        success: false,
        error: 'Invalid code',
      }) as any,
    });
    render(<LoginScreenContent authService={service} />);

    fireEvent.changeText(screen.getByLabelText('Email address'), 'user@example.com');
    fireEvent.press(screen.getByText('Send magic link'));

    await waitFor(() => {
      expect(screen.getByLabelText('Verification code')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByLabelText('Verification code'), '000000');
    fireEvent.press(screen.getByText('Verify code'));

    await waitFor(() => {
      expect(screen.getByText('Invalid code')).toBeTruthy();
    });
  });

  it('switches to password mode and signs in', async () => {
    const service = createMockAuthService();
    render(<LoginScreenContent authService={service} />);

    fireEvent.press(screen.getByText('Use password instead'));

    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Email address'), 'user@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'mypassword');
    fireEvent.press(screen.getByText('Sign in'));

    await waitFor(() => {
      expect(mockRouterCalls).toContainEqual({ method: 'replace', path: '/' });
    });

    expect(service.signInWithPassword).toHaveBeenCalledWith('user@example.com', 'mypassword');
  });

  it('shows error when auth service is not configured', async () => {
    render(<LoginScreenContent authService={null} />);

    fireEvent.changeText(screen.getByLabelText('Email address'), 'user@example.com');
    fireEvent.press(screen.getByText('Send magic link'));

    await waitFor(() => {
      expect(
        screen.getByText('Authentication is not configured. Continue as guest.'),
      ).toBeTruthy();
    });
  });

  it('validates empty email before sending OTP', async () => {
    render(<LoginScreenContent authService={createMockAuthService()} />);

    fireEvent.press(screen.getByText('Send magic link'));

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address.')).toBeTruthy();
    });
  });
});
