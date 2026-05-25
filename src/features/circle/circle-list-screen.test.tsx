import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react-native';

import type { Circle, CircleRepository } from './circle-repository';

const mockPushCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPushCalls.push(href),
    back: () => {},
    replace: () => {},
  },
}));

import { CircleListScreenContent } from './circle-list-screen';

function makeRepo(overrides: Partial<CircleRepository> = {}): CircleRepository {
  return {
    async createCircle() {
      throw new Error('not used');
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
}

const sampleCircle: Circle = {
  id: 'circle-1',
  name: 'Khan Family',
  privacy: 'private',
  inviteCode: 'ABCD1234',
  createdBy: 'user-a',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('CircleListScreenContent', () => {
  beforeEach(() => {
    mockPushCalls.length = 0;
  });

  it('renders an empty state with create + join entry points when there are no circles', async () => {
    render(<CircleListScreenContent repository={makeRepo()} isOnline />);

    await waitFor(() => {
      expect(screen.getByText(/no circles yet/i)).toBeTruthy();
    });
    expect(screen.getByLabelText('Create new circle')).toBeTruthy();
    expect(screen.getByLabelText('Enter invite code')).toBeTruthy();
  });

  it('lists the user circles after they load', async () => {
    const repo = makeRepo({
      async getMyCircles() {
        return [sampleCircle];
      },
    });
    render(<CircleListScreenContent repository={repo} isOnline />);

    await screen.findByText('Khan Family');
    expect(screen.getByLabelText('Open circle Khan Family')).toBeTruthy();
  });

  it('shows an offline banner and disables actions when offline', async () => {
    render(<CircleListScreenContent repository={makeRepo()} isOnline={false} />);

    await waitFor(() => {
      expect(screen.getByText(/needs internet/i)).toBeTruthy();
    });
  });
});
