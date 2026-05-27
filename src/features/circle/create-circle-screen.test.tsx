import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Circle, CircleRepository } from './circle-repository';

const mockBackCalls: number[] = [];
const mockReplaceCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBackCalls.push(1),
    replace: (href: string) => mockReplaceCalls.push(href),
    push: () => {},
  },
}));

import { CreateCircleScreenContent } from './create-circle-screen';

function makeRepo(
  overrides: Partial<CircleRepository> = {},
): CircleRepository & { lastCreate: string | null } {
  const captured: { value: string | null } = { value: null };
  const repo: CircleRepository = {
    async createCircle(name: string) {
      captured.value = name;
      const created: Circle = {
        id: 'circle-new',
        name,
        privacy: 'private',
        inviteCode: 'ABCD1234',
        createdBy: 'user-a',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      };
      return created;
    },
    async joinByCode() {
      throw new Error('not used');
    },
    async getMyCircles() {
      return [];
    },
    async getCircleMembers() {
      return [];
    },
    async leaveCircle() {},
    ...overrides,
  };
  return Object.defineProperty(repo, 'lastCreate', {
    get: () => captured.value,
  }) as CircleRepository & { lastCreate: string | null };
}

describe('CreateCircleScreenContent', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
    mockReplaceCalls.length = 0;
  });

  it('renders the form with a name field and a create button', () => {
    render(<CreateCircleScreenContent repository={makeRepo()} isOnline />);

    expect(screen.getByPlaceholderText(/circle name/i)).toBeTruthy();
    expect(screen.getByLabelText('Create circle')).toBeTruthy();
  });

  it('submits the trimmed name to the repository and navigates back on success', async () => {
    const repo = makeRepo();
    render(<CreateCircleScreenContent repository={repo} isOnline />);

    fireEvent.changeText(screen.getByPlaceholderText(/circle name/i), '  Khan Family  ');
    fireEvent.press(screen.getByLabelText('Create circle'));

    await waitFor(() => {
      expect(repo.lastCreate).toBe('Khan Family');
    });
    expect(mockBackCalls.length).toBe(1);
  });

  it('shows a validation error when the name is empty', async () => {
    const repo = makeRepo();
    render(<CreateCircleScreenContent repository={repo} isOnline />);

    fireEvent.press(screen.getByLabelText('Create circle'));

    await waitFor(() => {
      expect(screen.queryByText(/circle name is required/i)).toBeTruthy();
    });
    expect(repo.lastCreate).toBeNull();
  });

  it('shows the offline state and blocks submission when offline', () => {
    const repo = makeRepo();
    render(<CreateCircleScreenContent repository={repo} isOnline={false} />);

    expect(screen.getByText(/needs internet/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Create circle'));
    expect(repo.lastCreate).toBeNull();
  });

  it('surfaces repository errors to the user', async () => {
    const repo = makeRepo({
      async createCircle() {
        throw new Error('That invite code does not match any circle.');
      },
    });
    render(<CreateCircleScreenContent repository={repo} isOnline />);

    fireEvent.changeText(screen.getByPlaceholderText(/circle name/i), 'Family');
    fireEvent.press(screen.getByLabelText('Create circle'));

    await waitFor(() => {
      expect(screen.queryByText(/does not match any circle/i)).toBeTruthy();
    });
  });
});
