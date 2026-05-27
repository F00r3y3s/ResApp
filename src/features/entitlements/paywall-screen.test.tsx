import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PurchasesOffering, PurchasesPackage } from './entitlement-service';
import { DEFAULT_ENTITLEMENT_STATE, FREE_TIER_LIMITS, PRODUCT_IDS } from './entitlement-types';
import { PaywallScreen, type PaywallScreenProps } from './paywall-screen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePackage(id = '$rc_monthly'): PurchasesPackage {
  return {
    identifier: id,
    product: {
      identifier: PRODUCT_IDS.PREMIUM_MONTHLY,
      priceString: '$4.99',
      title: 'Premium Monthly',
      description: 'Full access to all premium features',
    },
  };
}

function makeAnnualPackage(): PurchasesPackage {
  return {
    identifier: '$rc_annual',
    product: {
      identifier: PRODUCT_IDS.PREMIUM_ANNUAL,
      priceString: '$39.99',
      title: 'Premium Annual',
      description: 'Best value — save 33%',
    },
  };
}

function makeOffering(): PurchasesOffering {
  return {
    identifier: 'default',
    availablePackages: [makePackage(), makeAnnualPackage()],
  };
}

function renderPaywall(overrides: Partial<PaywallScreenProps> = {}) {
  const defaultProps: PaywallScreenProps = {
    entitlementState: DEFAULT_ENTITLEMENT_STATE,
    offering: makeOffering(),
    isLoadingOfferings: false,
    onPurchase: jest.fn(),
    onRestore: jest.fn(),
    onDismiss: jest.fn(),
    ...overrides,
  };

  return { ...render(<PaywallScreen {...defaultProps} />), props: defaultProps };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PaywallScreen', () => {
  it('renders the paywall with header and benefits', () => {
    renderPaywall();

    expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
    expect(screen.getByText('Unlimited AI recipe suggestions')).toBeTruthy();
    expect(screen.getByText('Unlimited photo and receipt scans')).toBeTruthy();
    expect(screen.getByText('Unlimited AI-powered meal plans')).toBeTruthy();
  });

  it('shows free tier limits', () => {
    renderPaywall();

    expect(
      screen.getByText(`${FREE_TIER_LIMITS.aiSuggestionsPerDay} AI suggestions per day`),
    ).toBeTruthy();
    expect(screen.getByText(`${FREE_TIER_LIMITS.scansPerDay} scans per day`)).toBeTruthy();
    expect(
      screen.getByText(`${FREE_TIER_LIMITS.aiMealPlansPerWeek} AI meal plan per week`),
    ).toBeTruthy();
  });

  it('renders available packages', () => {
    renderPaywall();

    expect(screen.getByText('Premium Monthly')).toBeTruthy();
    expect(screen.getByText('$4.99')).toBeTruthy();
    expect(screen.getByText('Premium Annual')).toBeTruthy();
    expect(screen.getByText('$39.99')).toBeTruthy();
  });

  it('shows loading indicator when offerings are loading', () => {
    renderPaywall({ isLoadingOfferings: true, offering: null });

    expect(screen.getByTestId('offerings-loading')).toBeTruthy();
  });

  it('shows unavailable message when no offerings', () => {
    renderPaywall({ isLoadingOfferings: false, offering: null });

    expect(screen.getByTestId('offerings-unavailable')).toBeTruthy();
  });

  it('always shows Restore Purchases button (App Store requirement)', () => {
    renderPaywall();

    expect(screen.getByTestId('restore-button')).toBeTruthy();
    expect(screen.getByText('Restore Purchases')).toBeTruthy();
  });

  it('calls onRestore when Restore Purchases is tapped', () => {
    const { props } = renderPaywall();

    fireEvent.press(screen.getByTestId('restore-button'));

    expect(props.onRestore).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when Not now is tapped', () => {
    const { props } = renderPaywall();

    fireEvent.press(screen.getByTestId('dismiss-button'));

    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onPurchase with selected package when Subscribe is tapped', () => {
    const { props } = renderPaywall();

    // Select the monthly package
    fireEvent.press(screen.getByTestId('package-$rc_monthly'));
    // Tap subscribe
    fireEvent.press(screen.getByTestId('purchase-button'));

    expect(props.onPurchase).toHaveBeenCalledWith(makePackage());
  });

  it('does not call onPurchase when no package is selected', () => {
    const { props } = renderPaywall();

    fireEvent.press(screen.getByTestId('purchase-button'));

    expect(props.onPurchase).not.toHaveBeenCalled();
  });

  it('shows contextual message for daily AI limit', () => {
    renderPaywall({
      triggerAction: 'ai-suggestion',
      blockReason: 'daily-ai-limit',
    });

    expect(screen.getByTestId('paywall-context-message')).toBeTruthy();
    expect(
      screen.getByText(
        `You've used all ${FREE_TIER_LIMITS.aiSuggestionsPerDay} free AI suggestions for today. Upgrade for unlimited access.`,
      ),
    ).toBeTruthy();
  });

  it('shows contextual message for daily scan limit', () => {
    renderPaywall({
      triggerAction: 'scan',
      blockReason: 'daily-scan-limit',
    });

    expect(
      screen.getByText(
        `You've used all ${FREE_TIER_LIMITS.scansPerDay} free scans for today. Upgrade for unlimited scanning.`,
      ),
    ).toBeTruthy();
  });

  it('shows error message when provided', () => {
    renderPaywall({ errorMessage: 'Purchase failed. Please try again.' });

    expect(screen.getByTestId('paywall-error')).toBeTruthy();
    expect(screen.getByText('Purchase failed. Please try again.')).toBeTruthy();
  });

  it('shows purchase loading indicator when purchasing', () => {
    renderPaywall({ isPurchasing: true });

    expect(screen.getByTestId('purchase-loading')).toBeTruthy();
  });

  it('shows restore loading indicator when restoring', () => {
    renderPaywall({ isRestoring: true });

    expect(screen.getByTestId('restore-loading')).toBeTruthy();
  });

  it('disables buttons when processing', () => {
    renderPaywall({ isPurchasing: true });

    expect(screen.getByTestId('restore-button').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('purchase-button').props.accessibilityState.disabled).toBe(true);
  });

  describe('accessibility', () => {
    it('has accessible header', () => {
      renderPaywall();

      const header = screen.getByText('Upgrade to Premium');
      expect(header.props.accessibilityRole).toBe('header');
    });

    it('package options have radio role with labels', () => {
      renderPaywall();

      const monthlyOption = screen.getByTestId('package-$rc_monthly');
      expect(monthlyOption.props.accessibilityRole).toBe('radio');
      expect(monthlyOption.props.accessibilityLabel).toBe('Premium Monthly - $4.99');
    });

    it('buttons meet minimum 44pt tap target', () => {
      renderPaywall();

      const purchaseBtn = screen.getByTestId('purchase-button');
      const restoreBtn = screen.getByTestId('restore-button');
      const dismissBtn = screen.getByTestId('dismiss-button');

      // Check minHeight style (44pt minimum)
      expect(purchaseBtn.props.style.minHeight).toBeGreaterThanOrEqual(44);
      expect(restoreBtn.props.style.minHeight).toBeGreaterThanOrEqual(44);
      expect(dismissBtn.props.style.minHeight).toBeGreaterThanOrEqual(44);
    });
  });
});
