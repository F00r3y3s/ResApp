import {
    createEntitlementService,
    type CustomerInfo,
    type EntitlementService,
    type PurchasesOffering,
    type PurchasesPackage,
    type RevenueCatSDK,
} from './entitlement-service';
import { DEFAULT_ENTITLEMENT_STATE, ENTITLEMENT_IDS, PRODUCT_IDS } from './entitlement-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXED_NOW = new Date('2025-06-01T12:00:00.000Z');

function makePremiumCustomerInfo(): CustomerInfo {
  return {
    entitlements: {
      active: {
        [ENTITLEMENT_IDS.PREMIUM]: {
          isActive: true,
          expirationDate: '2025-07-01T12:00:00.000Z',
          willRenew: true,
          productIdentifier: PRODUCT_IDS.PREMIUM_MONTHLY,
        },
      },
    },
  };
}

function makeFreeCustomerInfo(): CustomerInfo {
  return { entitlements: { active: {} } };
}

function makeMockSDK(overrides: Partial<RevenueCatSDK> = {}): RevenueCatSDK {
  return {
    configure: jest.fn(),
    getCustomerInfo: jest.fn().mockResolvedValue(makeFreeCustomerInfo()),
    getOfferings: jest.fn().mockResolvedValue({ current: null }),
    purchasePackage: jest.fn().mockResolvedValue({ customerInfo: makeFreeCustomerInfo() }),
    restorePurchases: jest.fn().mockResolvedValue(makeFreeCustomerInfo()),
    logIn: jest.fn().mockResolvedValue({ customerInfo: makeFreeCustomerInfo() }),
    logOut: jest.fn().mockResolvedValue(makeFreeCustomerInfo()),
    ...overrides,
  };
}

function makePackage(): PurchasesPackage {
  return {
    identifier: '$rc_monthly',
    product: {
      identifier: PRODUCT_IDS.PREMIUM_MONTHLY,
      priceString: '$4.99',
      title: 'Premium Monthly',
      description: 'Full access to all premium features',
    },
  };
}

function makeOffering(): PurchasesOffering {
  return {
    identifier: 'default',
    availablePackages: [makePackage()],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EntitlementService', () => {
  let sdk: RevenueCatSDK;
  let service: EntitlementService;

  beforeEach(() => {
    sdk = makeMockSDK();
    service = createEntitlementService({ sdk, now: () => FIXED_NOW });
  });

  describe('initialize', () => {
    it('calls sdk.configure with the provided API key', () => {
      service.initialize('pk_test_abc123');
      expect(sdk.configure).toHaveBeenCalledWith({
        apiKey: 'pk_test_abc123',
        appUserID: null,
      });
    });

    it('passes appUserID when provided', () => {
      service.initialize('pk_test_abc123', 'user-42');
      expect(sdk.configure).toHaveBeenCalledWith({
        apiKey: 'pk_test_abc123',
        appUserID: 'user-42',
      });
    });
  });

  describe('getEntitlementState', () => {
    it('returns premium state when entitlement is active', async () => {
      (sdk.getCustomerInfo as jest.Mock).mockResolvedValue(makePremiumCustomerInfo());

      const state = await service.getEntitlementState();

      expect(state.isPremium).toBe(true);
      expect(state.status).toBe('active');
      expect(state.expiresAt).toBe('2025-07-01T12:00:00.000Z');
      expect(state.willRenew).toBe(true);
      expect(state.activeProductId).toBe(PRODUCT_IDS.PREMIUM_MONTHLY);
      expect(state.lastVerifiedAt).toBe(FIXED_NOW.toISOString());
    });

    it('returns non-premium state when no active entitlement', async () => {
      (sdk.getCustomerInfo as jest.Mock).mockResolvedValue(makeFreeCustomerInfo());

      const state = await service.getEntitlementState();

      expect(state.isPremium).toBe(false);
      expect(state.status).toBe('none');
      expect(state.activeProductId).toBeNull();
      expect(state.lastVerifiedAt).toBe(FIXED_NOW.toISOString());
    });

    it('fails closed on network error (returns non-premium)', async () => {
      (sdk.getCustomerInfo as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const state = await service.getEntitlementState();

      expect(state.isPremium).toBe(false);
      expect(state.status).toBe('none');
      expect(state).toEqual(DEFAULT_ENTITLEMENT_STATE);
    });
  });

  describe('getOfferings', () => {
    it('returns current offering when available', async () => {
      const offering = makeOffering();
      (sdk.getOfferings as jest.Mock).mockResolvedValue({ current: offering });

      const result = await service.getOfferings();

      expect(result).toEqual(offering);
    });

    it('returns null when no current offering', async () => {
      (sdk.getOfferings as jest.Mock).mockResolvedValue({ current: null });

      const result = await service.getOfferings();

      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      (sdk.getOfferings as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.getOfferings();

      expect(result).toBeNull();
    });
  });

  describe('purchase', () => {
    it('returns premium state after successful purchase', async () => {
      (sdk.purchasePackage as jest.Mock).mockResolvedValue({
        customerInfo: makePremiumCustomerInfo(),
      });

      const state = await service.purchase(makePackage());

      expect(state.isPremium).toBe(true);
      expect(state.status).toBe('active');
      expect(state.activeProductId).toBe(PRODUCT_IDS.PREMIUM_MONTHLY);
    });

    it('fails closed on purchase error (returns non-premium)', async () => {
      (sdk.purchasePackage as jest.Mock).mockRejectedValue(new Error('User cancelled'));

      const state = await service.purchase(makePackage());

      expect(state.isPremium).toBe(false);
      expect(state).toEqual(DEFAULT_ENTITLEMENT_STATE);
    });
  });

  describe('restorePurchases', () => {
    it('returns premium state when restore finds active subscription', async () => {
      (sdk.restorePurchases as jest.Mock).mockResolvedValue(makePremiumCustomerInfo());

      const state = await service.restorePurchases();

      expect(state.isPremium).toBe(true);
      expect(state.status).toBe('active');
    });

    it('returns non-premium when restore finds nothing', async () => {
      (sdk.restorePurchases as jest.Mock).mockResolvedValue(makeFreeCustomerInfo());

      const state = await service.restorePurchases();

      expect(state.isPremium).toBe(false);
    });

    it('fails closed on restore error', async () => {
      (sdk.restorePurchases as jest.Mock).mockRejectedValue(new Error('Network error'));

      const state = await service.restorePurchases();

      expect(state.isPremium).toBe(false);
      expect(state).toEqual(DEFAULT_ENTITLEMENT_STATE);
    });
  });

  describe('logIn', () => {
    it('associates user and returns entitlement state', async () => {
      (sdk.logIn as jest.Mock).mockResolvedValue({
        customerInfo: makePremiumCustomerInfo(),
      });

      const state = await service.logIn('user-42');

      expect(sdk.logIn).toHaveBeenCalledWith('user-42');
      expect(state.isPremium).toBe(true);
    });

    it('fails closed on logIn error', async () => {
      (sdk.logIn as jest.Mock).mockRejectedValue(new Error('Auth error'));

      const state = await service.logIn('user-42');

      expect(state.isPremium).toBe(false);
    });
  });

  describe('logOut', () => {
    it('disassociates user and returns fresh state', async () => {
      (sdk.logOut as jest.Mock).mockResolvedValue(makeFreeCustomerInfo());

      const state = await service.logOut();

      expect(sdk.logOut).toHaveBeenCalled();
      expect(state.isPremium).toBe(false);
    });

    it('fails closed on logOut error', async () => {
      (sdk.logOut as jest.Mock).mockRejectedValue(new Error('Network error'));

      const state = await service.logOut();

      expect(state).toEqual(DEFAULT_ENTITLEMENT_STATE);
    });
  });
});
