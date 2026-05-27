export { createEntitlementService } from './entitlement-service';
export type {
    CustomerInfo,
    EntitlementService,
    EntitlementServiceOptions,
    PurchasesOffering,
    PurchasesPackage,
    RevenueCatSDK
} from './entitlement-service';

export {
    DEFAULT_ENTITLEMENT_STATE,
    EMPTY_USAGE,
    ENTITLEMENT_IDS,
    FREE_TIER_LIMITS,
    PRODUCT_IDS
} from './entitlement-types';
export type {
    EntitlementId,
    EntitlementState,
    EntitlementStatus,
    ProductId,
    UsageCounter,
    UsageLimits
} from './entitlement-types';

export { checkGate, incrementUsage, remainingUses } from './usage-gate';
export type { GateBlockReason, GateResult, GatedAction } from './usage-gate';

export { useEntitlement } from './use-entitlement';
export type { UseEntitlementOptions, UseEntitlementResult } from './use-entitlement';

export { PaywallScreen } from './paywall-screen';
export type { PaywallScreenProps } from './paywall-screen';

