import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { TodayScreenContent } from './today-screen';

const mockPushCalls: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (href: string) => mockPushCalls.push(href),
  },
}));

describe('TodayScreenContent', () => {
  it('renders the screen 9 dashboard sections and keeps pantry access reachable', () => {
    render(<TodayScreenContent />);

    expect(screen.getByText('Good evening, Khan family')).toBeTruthy();
    expect(screen.getByText('Ask what to cook, swap, or prep')).toBeTruthy();
    expect(screen.getByText("Tonight's cook")).toBeTruthy();
    expect(screen.getByText('Lemon herb chicken traybake')).toBeTruthy();
    expect(screen.getByText('Use soon')).toBeTruthy();
    expect(screen.getByText('Meal plan')).toBeTruthy();
    expect(screen.getByText('Grocery gaps')).toBeTruthy();
    expect(screen.getByText('From your circle')).toBeTruthy();

    fireEvent.press(screen.getAllByText('See all')[0]);

    expect(mockPushCalls).toContain('/pantry');
  });
});
