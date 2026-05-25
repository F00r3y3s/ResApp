import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { RecipeHero } from './recipe-hero';

describe('RecipeHero', () => {
  it('renders a recipe-specific image when one is registered for the seed id', () => {
    render(<RecipeHero seedId="seed-002" cuisine="british" title="Lemon Herb Chicken Traybake" size={92} />);
    expect(screen.getByLabelText('Lemon Herb Chicken Traybake photo')).toBeTruthy();
  });

  it('falls back to an initial-on-tinted-paper card when no image is registered', () => {
    render(<RecipeHero seedId="seed-001" cuisine="levantine" title="Family Lentil Soup" size={92} />);
    expect(screen.getByText('FL')).toBeTruthy();
  });

  it('uses the cuisine palette tone for the placeholder background', () => {
    render(
      <RecipeHero seedId={null} cuisine="indian" title="Khichdi" size={92} testID="hero-tile" />,
    );
    const tile = screen.getByTestId('hero-tile');
    expect(tile.props.style).toEqual(
      expect.objectContaining({ backgroundColor: expect.any(String) }),
    );
  });
});
