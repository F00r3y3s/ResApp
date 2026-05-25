/**
 * Entitlement service — the single boundary between the app and RevenueCat.
 *
 * Security contract:
 * - Only the public RevenueCat SDK API key is used (no webhook secrets).
 * - Entitlement checks are server-authoritative: the SDK verifies with
 *   RevenueCat servers. If verification fails (network error, timeout),
 *   the service MUST return `isPremium: false` (fail-closed).
 * - The app never trusts a cached "premium" state for gating actions that
 *   cost money (AI calls, uploads). It always re-verifies or fails closed.
 */

import type {
    EntitlementState,
    ProductId,
} from './entitlement-types';
import {
    DEFAULT_ENTITLEMENT_STATE,
    ENTITLEMENT_IDS,
} from './entitlement-types';

// ---------------------------------------------------------------------------
// RevenueCat SDK interface (subset we use, for testability)
// ---------------------------------------------------------------------------

export type CustomerInfo = {
  entitlements: {
    active: Record<string, {
      isActive: boolean;
      expirationDate: string | null;
      willRenew: boolean;
      productIdentifier: string;
    }>;
  };
};

export type PurchasesPackage = {
  identifier: string;
  product: {
    identifier: string;
    priceString: string;
    title: string;
    description: string;
  };
};

export type PurchasesOffering = {
  identifier: string;
  availablePackages: PurchasesPackage[];
};

export type PurchasesOfferings = {
  current: PurchasesOffering | null;
};

export type RevenueCatSDK = {
  configure(options: { apiKey: string; appUserID?: string | null }): void;
  getCustomerInfo(): Promise<CustomerInfo>;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
  logIn(appUserID: string): Promise<{ customerInfo: CustomerInfo }>;
  logOut(): Promise<CustomerInfo>;
};

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export type EntitlementService = {
  /** Initialize RevenueCat with the public API key */
  initialize(apiKey: string, appUserID?: string | null): void;
  /** Check current entitlement state (server-authoritative, fail-closed) */
  getEntitlementState(): Promise<EntitlementState>;
  /** Get available purchase offerings */
  getOfferings(): Promise<PurchasesOffering | null>;
  /** Purchase a package and return updated entitlement state */
  purchase(pkg: PurchasesPackage): Promise<EntitlementState>;
  /** Restore previous purchases and return updated entitlement state */
  restorePurchases(): Promise<EntitlementState>;
  /** Associate a logged-in user with RevenueCat */
  logIn(appUserID: string): Promise<EntitlementState>;
  /** Disassociate the current user */
  logOut(): Promise<EntitlementState>;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export type EntitlementServiceOptions = {
  sdk: RevenueCatSDK;
  now?: () => Date;
};

export function createEntitlementService(options: EntitlementServiceOptions): EntitlementService {
  const { sdk } = options;
  const now = options.now ?? (() => new Date());

  return {
    initialize(apiKey, appUserID) {
      sdk.configure({ apiKey, appUserID: appUserID ?? null });
    },

    async getEntitlementState() {
      try {
        const info = await sdk.getCustomerInfo();
        return mapCustomerInfo(info, now());
      } catch {
        // Fail-closed: if we can't verify, user is not premium
        return DEFAULT_ENTITLEMENT_STATE;
      }
    },

    async getOfferings() {
      try {
        const offerings = await sdk.getOfferings();
        return offerings.current ?? null;
      } catch {
        return null;
      }
    },

    async purchase(pkg) {
      try {
        const { customerInfo } = await sdk.purchasePackage(pkg);
        return mapCustomerInfo(customerInfo, now());
      } catch {
        // Purchase failed or cancelled — return current state as non-premium
        return DEFAULT_ENTITLEMENT_STATE;
      }
    },

    async restorePurchases() {
      try {
        const info = await sdk.restorePurchases();
        return mapCustomerInfo(info, now());
      } catch {
        return DEFAULT_ENTITLEMENT_STATE;
      }
    },

    async logIn(appUserID) {
      try {
        const { customerInfo } = await sdk.logIn(appUserID);
        return mapCustomerInfo(customerInfo, now());
      } catch {
        return DEFAULT_ENTITLEMENT_STATE;
      }
    },

    async logOut() {
      try {
        const info = await sdk.logOut();
        return mapCustomerInfo(info, now());
      } catch {
        return DEFAULT_ENTITLEMENT_STATE;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapCustomerInfo(info: CustomerInfo, timestamp: Date): EntitlementState {
  const premiumEntitlement = info.entitlements.active[ENTITLEMENT_IDS.PREMIUM];

  if (!premiumEntitlement || !premiumEntitlement.isActive) {
    return {
      ...DEFAULT_ENTITLEMENT_STATE,
      lastVerifiedAt: timestamp.toISOString(),
    };
  }

  return {
    isPremium: true,
    status: 'active',
    expiresAt: premiumEntitlement.expirationDate,
    willRenew: premiumEntitlement.willRenew,
    activeProductId: premiumEntitlement.productIdentifier as ProductId,
    lastVerifiedAt: timestamp.toISOString(),
  };
}
