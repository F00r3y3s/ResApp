import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { SEED_RECIPES } from '@/features/recipes/seed-recipes';

import { getCreatorRecipes, SEED_CREATORS } from './creators-data';
import type { FollowRepository } from './follow-repository';

const mockPushCalls: string[] = [];
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPushCalls.push(href),
    back: () => mockBack(),
  },
}));

import { CreatorDetailScreenContent } from './creator-detail-screen';

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

describe('CreatorDetailScreenContent', () => {
  const testCreator = SEED_CREATORS[0];

  beforeEach(() => {
    mockPushCalls.length = 0;
    mockBack.mockClear();
  });

  it('renders creator name, bio, and recipes', async () => {
    const repo = createTestFollowRepository();
    render(
      <CreatorDetailScreenContent
        creatorId={testCreator.id}
        followRepository={repo}
      />,
    );

    await screen.findByText(testCreator.name);
    expect(screen.getByText(testCreator.bio)).toBeTruthy();

    // Check that the creator's recipes are listed
    const recipes = getCreatorRecipes(testCreator.id, SEED_RECIPES);
    for (const recipe of recipes) {
      expect(screen.getByText(recipe.title)).toBeTruthy();
    }
  });

  it('shows Follow button when not following', async () => {
    const repo = createTestFollowRepository();
    render(
      <CreatorDetailScreenContent
        creatorId={testCreator.id}
        followRepository={repo}
      />,
    );

    await screen.findByText(testCreator.name);
    expect(screen.getByText('Follow')).toBeTruthy();
  });

  it('shows Following button when already following', async () => {
    const repo = createTestFollowRepository();
    await repo.followCreator(testCreator.id);

    render(
      <CreatorDetailScreenContent
        creatorId={testCreator.id}
        followRepository={repo}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });
  });

  it('toggles follow state when button is pressed', async () => {
    const repo = createTestFollowRepository();
    render(
      <CreatorDetailScreenContent
        creatorId={testCreator.id}
        followRepository={repo}
      />,
    );

    await screen.findByText('Follow');

    const followButton = screen.getByLabelText(`Follow ${testCreator.name}`);
    fireEvent.press(followButton);

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });

    expect(await repo.isFollowing(testCreator.id)).toBe(true);
  });

  it('navigates to recipe detail when a recipe row is pressed', async () => {
    const repo = createTestFollowRepository();
    render(
      <CreatorDetailScreenContent
        creatorId={testCreator.id}
        followRepository={repo}
      />,
    );

    const recipes = getCreatorRecipes(testCreator.id, SEED_RECIPES);
    await screen.findByText(recipes[0].title);

    fireEvent.press(screen.getByLabelText(`Open ${recipes[0].title}`));

    expect(mockPushCalls).toContain(`/recipe/${recipes[0].id}`);
  });

  it('navigates back when back button is pressed', async () => {
    const repo = createTestFollowRepository();
    render(
      <CreatorDetailScreenContent
        creatorId={testCreator.id}
        followRepository={repo}
      />,
    );

    await screen.findByText(testCreator.name);

    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows error state for unknown creator', async () => {
    const repo = createTestFollowRepository();
    render(
      <CreatorDetailScreenContent
        creatorId="unknown-id"
        followRepository={repo}
      />,
    );

    expect(screen.getByText('Creator not found')).toBeTruthy();
  });
});
