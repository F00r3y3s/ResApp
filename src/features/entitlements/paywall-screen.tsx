/**
 * Paywall screen — honest, transparent premium upgrade flow.
 *
 * App Store requirements (Guideline 3.1.1):
 * - All premium digital features use Apple IAP through RevenueCat on iOS.
 * - Restore Purchases is always visible and accessible.
 * - Pricing is shown clearly before purchase.
 * - No dark patterns or misleading urgency.
 *
 * Design:
 * - Shows what premium unlocks (unlimited AI, scans, meal plans).
 * - Shows current free-tier usage if applicable.
 * - Monthly and annual options with clear pricing.
 * - Restore Purchases button always visible.
 * - Graceful error handling with user-friendly messages.
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import type { PurchasesOffering, PurchasesPackage } from './entitlement-service';
import type { EntitlementState } from './entitlement-types';
import { FREE_TIER_LIMITS } from './entitlement-types';
import type { GateBlockReason, GatedAction } from './usage-gate';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PaywallScreenProps = {
  /** Current entitlement state */
  entitlementState: EntitlementState;
  /** Available offerings from RevenueCat (null if loading failed) */
  offering: PurchasesOffering | null;
  /** Whether offerings are still loading */
  isLoadingOfferings: boolean;
  /** The action that triggered the paywall (for contextual messaging) */
  triggerAction?: GatedAction;
  /** The specific block reason (for contextual messaging) */
  blockReason?: GateBlockReason;
  /** Called when user selects a package to purchase */
  onPurchase: (pkg: PurchasesPackage) => void;
  /** Called when user taps Restore Purchases */
  onRestore: () => void;
  /** Called when user dismisses the paywall */
  onDismiss: () => void;
  /** Whether a purchase is currently in progress */
  isPurchasing?: boolean;
  /** Whether a restore is currently in progress */
  isRestoring?: boolean;
  /** Error message to display (e.g., purchase failed) */
  errorMessage?: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaywallScreen({
  entitlementState,
  offering,
  isLoadingOfferings,
  triggerAction,
  blockReason,
  onPurchase,
  onRestore,
  onDismiss,
  isPurchasing = false,
  isRestoring = false,
  errorMessage = null,
}: PaywallScreenProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const isProcessing = isPurchasing || isRestoring;

  const contextMessage = getContextMessage(triggerAction, blockReason);

  return (
    <ScrollView
      testID="paywall-screen"
      contentContainerStyle={{ flexGrow: 1, padding: 24 }}
      accessibilityRole="none"
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text
          style={{ fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}
          accessibilityRole="header"
        >
          Upgrade to Premium
        </Text>
        {contextMessage && (
          <Text
            style={{ fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 8 }}
            testID="paywall-context-message"
          >
            {contextMessage}
          </Text>
        )}
      </View>

      {/* Benefits */}
      <View style={{ marginBottom: 24 }} testID="paywall-benefits">
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          What you get with Premium:
        </Text>
        <BenefitRow text="Unlimited AI recipe suggestions" />
        <BenefitRow text="Unlimited photo and receipt scans" />
        <BenefitRow text="Unlimited AI-powered meal plans" />
        <BenefitRow text="Priority support" />
      </View>

      {/* Free tier info */}
      <View style={{ marginBottom: 24, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
          Free tier includes:
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          {FREE_TIER_LIMITS.aiSuggestionsPerDay} AI suggestions per day
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          {FREE_TIER_LIMITS.scansPerDay} scans per day
        </Text>
        <Text style={{ fontSize: 14, color: '#666' }}>
          {FREE_TIER_LIMITS.aiMealPlansPerWeek} AI meal plan per week
        </Text>
      </View>

      {/* Offerings */}
      {isLoadingOfferings ? (
        <View style={{ alignItems: 'center', padding: 24 }}>
          <ActivityIndicator testID="offerings-loading" />
        </View>
      ) : offering ? (
        <View style={{ marginBottom: 24 }} testID="paywall-packages">
          {offering.availablePackages.map((pkg) => (
            <PackageOption
              key={pkg.identifier}
              pkg={pkg}
              isSelected={selectedPackageId === pkg.identifier}
              onSelect={() => setSelectedPackageId(pkg.identifier)}
              disabled={isProcessing}
            />
          ))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#999', textAlign: 'center' }} testID="offerings-unavailable">
            Subscription options are temporarily unavailable. Please try again later.
          </Text>
        </View>
      )}

      {/* Error message */}
      {errorMessage && (
        <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#fee', borderRadius: 8 }}>
          <Text style={{ color: '#c00', textAlign: 'center' }} testID="paywall-error">
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Purchase button */}
      <Pressable
        testID="purchase-button"
        onPress={() => {
          const pkg = offering?.availablePackages.find((p) => p.identifier === selectedPackageId);
          if (pkg) onPurchase(pkg);
        }}
        disabled={!selectedPackageId || isProcessing}
        accessibilityRole="button"
        accessibilityLabel="Subscribe"
        accessibilityState={{ disabled: !selectedPackageId || isProcessing }}
        style={{
          backgroundColor: selectedPackageId && !isProcessing ? '#2563eb' : '#ccc',
          paddingVertical: 16,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 12,
          minHeight: 52,
        }}
      >
        {isPurchasing ? (
          <ActivityIndicator color="#fff" testID="purchase-loading" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
            Subscribe
          </Text>
        )}
      </Pressable>

      {/* Restore Purchases — always visible per App Store requirement */}
      <Pressable
        testID="restore-button"
        onPress={onRestore}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel="Restore Purchases"
        accessibilityState={{ disabled: isProcessing }}
        style={{
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 12,
          minHeight: 48,
        }}
      >
        {isRestoring ? (
          <ActivityIndicator testID="restore-loading" />
        ) : (
          <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '500' }}>
            Restore Purchases
          </Text>
        )}
      </Pressable>

      {/* Dismiss */}
      <Pressable
        testID="dismiss-button"
        onPress={onDismiss}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel="Not now"
        style={{
          paddingVertical: 12,
          alignItems: 'center',
          minHeight: 44,
        }}
      >
        <Text style={{ color: '#999', fontSize: 14 }}>Not now</Text>
      </Pressable>

      {/* Legal */}
      <View style={{ marginTop: 16, paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 16 }}>
          Payment will be charged to your Apple ID account at confirmation of purchase.
          Subscription automatically renews unless cancelled at least 24 hours before
          the end of the current period. Manage subscriptions in your device Settings.
        </Text>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BenefitRow({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <Text style={{ fontSize: 16, marginRight: 8 }}>✓</Text>
      <Text style={{ fontSize: 15 }}>{text}</Text>
    </View>
  );
}

type PackageOptionProps = {
  pkg: PurchasesPackage;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
};

function PackageOption({ pkg, isSelected, onSelect, disabled }: PackageOptionProps) {
  return (
    <Pressable
      testID={`package-${pkg.identifier}`}
      onPress={onSelect}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected, disabled }}
      accessibilityLabel={`${pkg.product.title} - ${pkg.product.priceString}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: isSelected ? '#2563eb' : '#e5e5e5',
        backgroundColor: isSelected ? '#eff6ff' : '#fff',
        minHeight: 64,
      }}
    >
      {/* Radio indicator */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: isSelected ? '#2563eb' : '#ccc',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        {isSelected && (
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#2563eb',
            }}
          />
        )}
      </View>

      {/* Package info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{pkg.product.title}</Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
          {pkg.product.description}
        </Text>
      </View>

      {/* Price */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#2563eb' }}>
        {pkg.product.priceString}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getContextMessage(
  action?: GatedAction,
  reason?: GateBlockReason,
): string | null {
  if (!reason) return null;

  switch (reason) {
    case 'daily-ai-limit':
      return `You've used all ${FREE_TIER_LIMITS.aiSuggestionsPerDay} free AI suggestions for today. Upgrade for unlimited access.`;
    case 'daily-scan-limit':
      return `You've used all ${FREE_TIER_LIMITS.scansPerDay} free scans for today. Upgrade for unlimited scanning.`;
    case 'weekly-meal-plan-limit':
      return `You've used your free AI meal plan for this week. Upgrade for unlimited meal planning.`;
    case 'not-premium':
      return 'This feature requires a Premium subscription.';
    case 'verification-failed':
      return 'Unable to verify your subscription. Please check your connection and try again.';
    default:
      return null;
  }
}
