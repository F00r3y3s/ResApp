import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Circle, CircleRepository } from './circle-repository';

const mockBackCalls: number[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBackCalls.push(1),
    push: () => {},
    replace: () => {},
  },
}));

import { JoinCircleScreenContent } from './join-circle-screen';

function makeRepo(
  overrides: Partial<CircleRepository> = {},
): CircleRepository & { lastJoin: string | null } {
  const captured: { value: string | null } = { value: null };
  const repo: CircleRepository = {
    async createCircle() {
      throw new Error('not used');
    },
    async joinByCode(code: string) {
      captured.value = code;
      const c: Circle = {
        id: 'circle-x',
        name: 'Existing Family',
        privacy: 'private',
        inviteCode: code,
        createdBy: 'user-a',
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-01T00:00:00.000Z',
      };
      return c;
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
  return Object.defineProperty(repo, 'lastJoin', {
    get: () => captured.value,
  }) as CircleRepository & { lastJoin: string | null };
}

describe('JoinCircleScreenContent', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
  });

  it('renders the invite code input and a join button', () => {
    render(<JoinCircleScreenContent repository={makeRepo()} isOnline />);

    expect(screen.getByPlaceholderText(/invite code/i)).toBeTruthy();
    expect(screen.getByLabelText('Join circle')).toBeTruthy();
  });

  it('submits the uppercased code to the repository and navigates back on success', async () => {
    const repo = makeRepo();
    render(<JoinCircleScreenContent repository={repo} isOnline />);

    fireEvent.changeText(screen.getByPlaceholderText(/invite code/i), 'abcd1234');
    fireEvent.press(screen.getByLabelText('Join circle'));

    await waitFor(() => {
      expect(repo.lastJoin).toBe('ABCD1234');
    });
    expect(mockBackCalls.length).toBe(1);
  });

  it('rejects too-short codes locally before calling the repository', async () => {
    const repo = makeRepo();
    render(<JoinCircleScreenContent repository={repo} isOnline />);

    fireEvent.changeText(screen.getByPlaceholderText(/invite code/i), 'AB');
    fireEvent.press(screen.getByLabelText('Join circle'));

    await waitFor(() => {
      expect(screen.queryByText(/invite code is too short/i)).toBeTruthy();
    });
    expect(repo.lastJoin).toBeNull();
  });

  it('shows the offline state and blocks submission when offline', () => {
    const repo = makeRepo();
    render(<JoinCircleScreenContent repository={repo} isOnline={false} />);

    expect(screen.getByText(/needs internet/i)).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText(/invite code/i), 'ABCD1234');
    fireEvent.press(screen.getByLabelText('Join circle'));
    expect(repo.lastJoin).toBeNull();
  });

  it('surfaces a repository error when the code is wrong', async () => {
    const repo = makeRepo({
      async joinByCode() {
        throw new Error('That invite code does not match any circle.');
      },
    });
    render(<JoinCircleScreenContent repository={repo} isOnline />);

    fireEvent.changeText(screen.getByPlaceholderText(/invite code/i), 'ZZZZZZZZ');
    fireEvent.press(screen.getByLabelText('Join circle'));

    await waitFor(() => {
      expect(screen.queryByText(/does not match any circle/i)).toBeTruthy();
    });
  });
});
