import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Circle } from '../circle/circle-repository';
import type { CooksnapRepository } from './cooksnap-repository';
import { ShareCooksnapScreen } from './share-cooksnap-screen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCircles: Circle[] = [
  {
    id: 'circle-1',
    name: 'Khan Family',
    privacy: 'private',
    inviteCode: 'ABCD1234',
    createdBy: 'user-a',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  {
    id: 'circle-2',
    name: 'Cooking Club',
    privacy: 'private',
    inviteCode: 'EFGH5678',
    createdBy: 'user-b',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
];

const mockRepository: CooksnapRepository = {
  createCooksnap: jest.fn<CooksnapRepository['createCooksnap']>().mockResolvedValue({
    id: 'snap-1',
    recipeId: 'recipe-abc',
    circleId: 'circle-1',
    imagePath: 'cooksnap-images/user-a/1234.jpg',
    caption: 'Delicious!',
    createdBy: 'user-a',
    createdAt: '2026-06-02T12:00:00.000Z',
  }),
  getCooksnapsByCircle: jest.fn<CooksnapRepository['getCooksnapsByCircle']>().mockResolvedValue([]),
  getImageUrl: jest.fn<CooksnapRepository['getImageUrl']>().mockReturnValue('https://example.com/img.jpg'),
};

const defaultProps = {
  recipeId: 'recipe-abc',
  recipeTitle: 'Chicken Biryani',
  imageUri: 'file:///tmp/photo.jpg',
  circles: mockCircles,
  repository: mockRepository,
  onSuccess: jest.fn(),
  onCancel: jest.fn(),
  isOnline: true,
};

describe('ShareCooksnapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the photo preview and recipe title', () => {
    const { getByText, getByTestId } = render(
      <ShareCooksnapScreen {...defaultProps} />,
    );

    expect(getByTestId('cooksnap-image-preview')).toBeTruthy();
    expect(getByText(/Chicken Biryani/i)).toBeTruthy();
  });

  it('renders circle picker with available circles', () => {
    const { getByText } = render(
      <ShareCooksnapScreen {...defaultProps} />,
    );

    expect(getByText('Khan Family')).toBeTruthy();
    expect(getByText('Cooking Club')).toBeTruthy();
  });

  it('renders the caption input with 200 char limit', () => {
    const { getByPlaceholderText } = render(
      <ShareCooksnapScreen {...defaultProps} />,
    );

    const input = getByPlaceholderText(/caption/i);
    expect(input).toBeTruthy();
    expect(input.props.maxLength).toBe(200);
  });

  it('shows character count for caption', () => {
    const { getByPlaceholderText, getByText } = render(
      <ShareCooksnapScreen {...defaultProps} />,
    );

    const input = getByPlaceholderText(/caption/i);
    fireEvent.changeText(input, 'Hello world');

    expect(getByText('11/200')).toBeTruthy();
  });

  it('calls repository.createCooksnap with correct params on share', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <ShareCooksnapScreen {...defaultProps} />,
    );

    // Enter caption
    const input = getByPlaceholderText(/caption/i);
    fireEvent.changeText(input, 'Delicious!');

    // Select a circle
    fireEvent.press(getByText('Khan Family'));

    // Press share
    fireEvent.press(getByTestId('share-button'));

    await waitFor(() => {
      expect(mockRepository.createCooksnap).toHaveBeenCalledWith({
        recipeId: 'recipe-abc',
        circleId: 'circle-1',
        imageUri: 'file:///tmp/photo.jpg',
        caption: 'Delicious!',
      });
    });
  });

  it('calls onSuccess after successful share', async () => {
    const { getByText, getByTestId } = render(
      <ShareCooksnapScreen {...defaultProps} />,
    );

    // Select a circle
    fireEvent.press(getByText('Khan Family'));

    // Press share
    fireEvent.press(getByTestId('share-button'));

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('disables share button when no circle is selected', () => {
    const { getByTestId } = render(
      <ShareCooksnapScreen {...defaultProps} />,
    );

    const shareButton = getByTestId('share-button');
    expect(shareButton.props.accessibilityState?.disabled ?? shareButton.props.disabled).toBeTruthy();
  });

  it('shows offline message when not connected', () => {
    const { getByText } = render(
      <ShareCooksnapScreen {...defaultProps} isOnline={false} />,
    );

    expect(getByText(/needs internet/i)).toBeTruthy();
  });

  it('disables share button when offline', () => {
    const { getByTestId } = render(
      <ShareCooksnapScreen {...defaultProps} isOnline={false} />,
    );

    const shareButton = getByTestId('share-button');
    expect(shareButton.props.accessibilityState?.disabled ?? shareButton.props.disabled).toBeTruthy();
  });

  it('calls onCancel when cancel is pressed', () => {
    const { getByTestId } = render(
      <ShareCooksnapScreen {...defaultProps} />,
    );

    fireEvent.press(getByTestId('cancel-button'));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('shows error message when share fails', async () => {
    const failingRepo: CooksnapRepository = {
      ...mockRepository,
      createCooksnap: jest.fn<CooksnapRepository['createCooksnap']>().mockRejectedValue(
        new Error('Upload failed'),
      ),
    };

    const { getByText, getByTestId } = render(
      <ShareCooksnapScreen {...defaultProps} repository={failingRepo} />,
    );

    // Select a circle
    fireEvent.press(getByText('Khan Family'));

    // Press share
    fireEvent.press(getByTestId('share-button'));

    await waitFor(() => {
      expect(getByText(/failed|error/i)).toBeTruthy();
    });
  });
});
