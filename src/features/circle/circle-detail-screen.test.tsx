import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Circle, CircleMember, CircleRepository } from './circle-repository';

const mockBackCalls: number[] = [];
const mockReplaceCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBackCalls.push(1),
    replace: (href: string) => mockReplaceCalls.push(href),
    push: () => {},
  },
}));

import { CircleDetailScreenContent } from './circle-detail-screen';

const sampleCircle: Circle = {
  id: 'circle-1',
  name: 'Khan Family',
  privacy: 'private',
  inviteCode: 'ABCD1234',
  createdBy: 'user-a',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const members: CircleMember[] = [
  { circleId: 'circle-1', userId: 'user-a', role: 'owner', joinedAt: '2026-06-01T00:00:00.000Z' },
  { circleId: 'circle-1', userId: 'user-b', role: 'member', joinedAt: '2026-06-02T00:00:00.000Z' },
];

function makeRepo(
  overrides: Partial<CircleRepository> = {},
): CircleRepository & { leaveCalls: string[] } {
  const calls: string[] = [];
  const repo: CircleRepository = {
    async createCircle() {
      throw new Error('not used');
    },
    async joinByCode() {
      throw new Error('not used');
    },
    async getMyCircles() {
      return [sampleCircle];
    },
    async getCircleMembers() {
      return members;
    },
    async leaveCircle(id: string) {
      calls.push(id);
    },
    ...overrides,
  };
  return Object.defineProperty(repo, 'leaveCalls', {
    get: () => calls,
  }) as CircleRepository & { leaveCalls: string[] };
}

describe('CircleDetailScreenContent', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
    mockReplaceCalls.length = 0;
  });

  it('shows the circle name, invite code, and member rows', async () => {
    render(<CircleDetailScreenContent circleId="circle-1" repository={makeRepo()} />);

    await screen.findByText('Khan Family');
    expect(screen.getByText(/ABCD1234/)).toBeTruthy();
    // Owner badge for user-a
    expect(screen.getByText(/Owner/i)).toBeTruthy();
    // Member badge for user-b
    expect(screen.getByText(/^Member$/)).toBeTruthy();
    expect(screen.getByLabelText('Leave circle')).toBeTruthy();
  });

  it('calls leaveCircle and navigates back when the user leaves', async () => {
    const repo = makeRepo();
    render(<CircleDetailScreenContent circleId="circle-1" repository={repo} />);

    await screen.findByText('Khan Family');
    fireEvent.press(screen.getByLabelText('Leave circle'));

    await waitFor(() => {
      expect(repo.leaveCalls).toEqual(['circle-1']);
    });
    expect(mockBackCalls.length).toBe(1);
  });

  it('shows a not-found state when the circle is missing', async () => {
    const repo = makeRepo({
      async getMyCircles() {
        return [];
      },
    });
    render(<CircleDetailScreenContent circleId="circle-1" repository={repo} />);

    await screen.findByText(/couldn'?t find that circle/i);
  });
});
