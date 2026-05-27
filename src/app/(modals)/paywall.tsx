/**
 * Paywall modal route.
 *
 * Presents the paywall as a modal sheet. Route params allow contextual
 * messaging based on which action triggered the paywall.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { GateBlockReason, GatedAction } from '@/features/entitlements';
import {
    createEntitlementService,
    DEFAULT_ENTITLEMENT_STATE,
    PaywallScreen,
    type PurchasesOffering,
    type PurchasesPackage,
} from '@/features/entitlements';

// In production, the SDK would be imported from react-native-purchases.
// For now we use a lazy import pattern so the route file stays focused on composition.
let _service: ReturnType<typeof createEntitlementService> | null = null;

function getService() {
  if (!_service) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Purchases = require('react-native-purchases').default;
    _service = createEntitlementService({ sdk: Purchases });
  }
  return _service;
}

export default function PaywallModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    action?: string;
    reason?: string;
  }>();

  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entitlementState, setEntitlementState] = useState(DEFAULT_ENTITLEMENT_STATE);

  useEffect(() => {
    void loadOfferings();
  }, []);

  async function loadOfferings() {
    setIsLoadingOfferings(true);
    try {
      const service = getService();
      const [state, currentOffering] = await Promise.all([
        service.getEntitlementState(),
        service.getOfferings(),
      ]);
      setEntitlementState(state);
      setOffering(currentOffering);
    } finally {
      setIsLoadingOfferings(false);
    }
  }

  const handlePurchase = useCallback(async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    setErrorMessage(null);
    try {
      const service = getService();
      const state = await service.purchase(pkg);
      setEntitlementState(state);
      if (state.isPremium) {
        router.back();
      } else {
        setErrorMessage('Purchase was not completed. Please try again.');
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }, [router]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    setErrorMessage(null);
    try {
      const service = getService();
      const state = await service.restorePurchases();
      setEntitlementState(state);
      if (state.isPremium) {
        router.back();
      } else {
        setErrorMessage('No active subscription found. If you believe this is an error, contact support.');
      }
    } catch {
      setErrorMessage('Unable to restore purchases. Please check your connection.');
    } finally {
      setIsRestoring(false);
    }
  }, [router]);

  const handleDismiss = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <PaywallScreen
      entitlementState={entitlementState}
      offering={offering}
      isLoadingOfferings={isLoadingOfferings}
      triggerAction={params.action as GatedAction | undefined}
      blockReason={params.reason as GateBlockReason | undefined}
      onPurchase={handlePurchase}
      onRestore={handleRestore}
      onDismiss={handleDismiss}
      isPurchasing={isPurchasing}
      isRestoring={isRestoring}
      errorMessage={errorMessage}
    />
  );
}
