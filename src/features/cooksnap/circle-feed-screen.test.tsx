import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { CircleFeedScreen } from './circle-feed-screen';
import type { Cooksnap, CooksnapRepository } from './cooksnap-repository';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const sampleCooksnaps: Cooksnap[] = [
  {
    id: 'snap-1',
    recipeId: 'recipe-abc',
    circleId: 'circle-1',
    imagePath: 'cooksnap-images/user-a/1234.jpg',
    caption: 'Turned out great!',
    createdBy: 'user-a',
    createdAt: '2026-06-02T12:00:00.000Z',
  },
  {
    id: 'snap-2',
    recipeId: 'recipe-def',
    circleId: 'circle-1',
    imagePath: 'cooksnap-images/user-b/5678.jpg',
    caption: null,
    createdBy: 'user-b',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
];

const mockRepository: CooksnapRepository = {
  createCooksnap: jest.fn<CooksnapRepository['createCooksnap']>().mockResolvedValue(sampleCooksnaps[0]),
  getCooksnapsByCircle: jest.fn<CooksnapRepository['getCooksnapsByCircle']>().mockResolvedValue(sampleCooksnaps),
  getImageUrl: jest.fn<CooksnapRepository['getImageUrl']>().mockImplementation(
    (path) => `https://storage.example.com/${path}`,
  ),
};

const mockRecipeTitles: Record<string, string> = {
  'recipe-abc': 'Chicken Biryani',
  'recipe-def': 'Palak Paneer',
};

describe('CircleFeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders cooksnap cards with captions', async () => {
    const { findByText } = render(
      <CircleFeedScreen
        circleId="circle-1"
        repository={mockRepository}
        recipeTitles={mockRecipeTitles}
        onRecipePress={jest.fn()}
      />,
    );

    expect(await findByText('Turned out great!')).toBeTruthy();
  });

  it('renders recipe title links for each cooksnap', async () => {
    const { findByText } = render(
      <CircleFeedScreen
        circleId="circle-1"
        repository={mockRepository}
        recipeTitles={mockRecipeTitles}
        onRecipePress={jest.fn()}
      />,
    );

    expect(await findByText('Chicken Biryani')).toBeTruthy();
    expect(await findByText('Palak Paneer')).toBeTruthy();
  });

  it('calls onRecipePress with the recipe id when recipe link is tapped', async () => {
    const onRecipePress = jest.fn();
    const { findByText } = render(
      <CircleFeedScreen
        circleId="circle-1"
        repository={mockRepository}
        recipeTitles={mockRecipeTitles}
        onRecipePress={onRecipePress}
      />,
    );

    const recipeLink = await findByText('Chicken Biryani');
    fireEvent.press(recipeLink);

    expect(onRecipePress).toHaveBeenCalledWith('recipe-abc');
  });

  it('renders image thumbnails for each cooksnap', async () => {
    const { findAllByTestId } = render(
      <CircleFeedScreen
        circleId="circle-1"
        repository={mockRepository}
        recipeTitles={mockRecipeTitles}
        onRecipePress={jest.fn()}
      />,
    );

    const images = await findAllByTestId('cooksnap-thumbnail');
    expect(images).toHaveLength(2);
  });

  it('shows empty state when no cooksnaps exist', async () => {
    const emptyRepo: CooksnapRepository = {
      ...mockRepository,
      getCooksnapsByCircle: jest.fn<CooksnapRepository['getCooksnapsByCircle']>().mockResolvedValue([]),
    };

    const { findByText } = render(
      <CircleFeedScreen
        circleId="circle-1"
        repository={emptyRepo}
        recipeTitles={{}}
        onRecipePress={jest.fn()}
      />,
    );

    expect(await findByText(/no cooksnaps/i)).toBeTruthy();
  });

  it('calls getCooksnapsByCircle with the correct circle id', () => {
    render(
      <CircleFeedScreen
        circleId="circle-1"
        repository={mockRepository}
        recipeTitles={mockRecipeTitles}
        onRecipePress={jest.fn()}
      />,
    );

    expect(mockRepository.getCooksnapsByCircle).toHaveBeenCalledWith('circle-1');
  });

  it('renders timestamps for each cooksnap', async () => {
    const { findByText } = render(
      <CircleFeedScreen
        circleId="circle-1"
        repository={mockRepository}
        recipeTitles={mockRecipeTitles}
        onRecipePress={jest.fn()}
      />,
    );

    // Should show some form of the date
    expect(await findByText(/Jun 2/i)).toBeTruthy();
  });
});
