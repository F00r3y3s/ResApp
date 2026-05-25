import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SEED_CREATORS } from './creators-data';
import type { FollowRepository } from './follow-repository';

const mockPushCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPushCalls.push(href),
    back: jest.fn(),
  },
}));

import { CreatorListScreenContent } from './creator-list-screen';

function createTestFollowRepository(): FollowRepository {
  const followed = new Set<string>();

  return {
    async getFollowedCreatorIds() {
      return [...followed];
    },
    async followCreator(id: string) {
      followed.add(id);
    },
    async unfollowCreator(id: string) {
      followed.delete(id);
    },
    async isFollowing(id: string) {
      return followed.has(id);
    },
  };
}

describe('CreatorListScreenContent', () => {
  beforeEach(() => {
    mockPushCalls.length = 0;
  });

  it('renders all seed creators with name and recipe count', async () => {
    const repo = createTestFollowRepository();
    render(<CreatorListScreenContent followRepository={repo} />);

    for (const creator of SEED_CREATORS) {
      await screen.findByText(creator.name);
    }

    // Check that recipe count text appears for creators
    const recipeCounts = screen.getAllByText(/\d+ recipes?/);
    expect(recipeCounts.length).toBe(SEED_CREATORS.length);
  });

  it('shows Follow button for unfollowed creators', async () => {
    const repo = createTestFollowRepository();
    render(<CreatorListScreenContent followRepository={repo} />);

    await screen.findByText(SEED_CREATORS[0].name);

    const followButtons = screen.getAllByText('Follow');
    expect(followButtons.length).toBe(SEED_CREATORS.length);
  });

  it('toggles follow state when Follow button is pressed', async () => {
    const repo = createTestFollowRepository();
    render(<CreatorListScreenContent followRepository={repo} />);

    await screen.findByText(SEED_CREATORS[0].name);

    const followButton = screen.getByLabelText(`Follow ${SEED_CREATORS[0].name}`);
    fireEvent.press(followButton);

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });

    // Verify the repository was updated
    expect(await repo.isFollowing(SEED_CREATORS[0].id)).toBe(true);
  });

  it('toggles unfollow when Following button is pressed', async () => {
    const repo = createTestFollowRepository();
    await repo.followCreator(SEED_CREATORS[0].id);

    render(<CreatorListScreenContent followRepository={repo} />);

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });

    const unfollowButton = screen.getByLabelText(`Unfollow ${SEED_CREATORS[0].name}`);
    fireEvent.press(unfollowButton);

    await waitFor(() => {
      expect(screen.queryByText('Following')).toBeNull();
    });

    expect(await repo.isFollowing(SEED_CREATORS[0].id)).toBe(false);
  });

  it('navigates to creator detail when card is pressed', async () => {
    const repo = createTestFollowRepository();
    render(<CreatorListScreenContent followRepository={repo} />);

    await screen.findByText(SEED_CREATORS[0].name);

    const card = screen.getByLabelText(`View ${SEED_CREATORS[0].name}`);
    fireEvent.press(card);

    expect(mockPushCalls).toContain(`/creator/${SEED_CREATORS[0].id}`);
  });
});
