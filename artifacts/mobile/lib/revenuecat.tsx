// Add this export so verification-paywall.tsx doesn't break
export const VERIFICATION_ENTITLEMENT_ID = "verified";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Purchases, { CustomerInfo, PurchasesPackage, Offerings } from 'react-native-purchases';

// Replace with your actual RevenueCat API key from .env, or keep the fallback for testing
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || 'appl_YourApiKeyHere';

interface SubscriptionContextType {
  customerInfo: CustomerInfo | null;
  offerings: Offerings | null;
  isLoading: boolean;
  isConfigured: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  isSubscribed: boolean;
  isVerified: boolean; // Added for compatibility with opportunities.tsx
  purchase: (pkg: PurchasesPackage) => Promise<CustomerInfo | null>;
  restore: () => Promise<CustomerInfo | null>;
  refetchCustomerInfo: () => Promise<CustomerInfo | null>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

let isInitialized = false;

// Called once in _layout.tsx
export function initializeRevenueCat() {
  if (!isInitialized) {
    try {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      isInitialized = true;
    } catch (error) {
      console.warn("RevenueCat configure error:", error);
    }
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Exposed so paywall.tsx can await it before routing
  const refetchCustomerInfo = useCallback(async () => {
    try {
      if (!isInitialized) return null;
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      return info;
    } catch (error) {
      console.warn('Failed to refetch customer info:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        if (!isInitialized) {
          Purchases.configure({ apiKey: REVENUECAT_API_KEY });
          isInitialized = true;
        }
        setIsConfigured(true);

        // Fetch both safely in parallel
        const [info, offs] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings()
        ]);

        if (mounted) {
          setCustomerInfo(info);
          setOfferings(offs);
          setIsLoading(false); // ✅ CRITICAL: Always turns off loading on success
        }
      } catch (error) {
        console.error('RevenueCat initialization error (falling back gracefully):', error);
        if (mounted) {
          setIsLoading(false); // ✅ CRITICAL: Prevents infinite loading spinners on error
          setIsConfigured(false);
        }
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  const purchase = async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    try {
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(newInfo);
      return newInfo;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('Purchase error:', error);
      }
      throw error;
    } finally {
      setIsPurchasing(false);
    }
  };

  const restore = async () => {
    setIsRestoring(true);
    try {
      const newInfo = await Purchases.restorePurchases();
      setCustomerInfo(newInfo);
      return newInfo;
    } catch (error) {
      console.error('Restore error:', error);
      throw error;
    } finally {
      setIsRestoring(false);
    }
  };

  // ⚠️ IMPORTANT: Change 'premium' or 'pro' to match your actual RevenueCat entitlement ID
  const isSubscribed = !!(customerInfo?.entitlements.active['premium'] || customerInfo?.entitlements.active['pro']);

  // Alias for compatibility with components checking isVerified
  const isVerified = isSubscribed;

  const value = {
    customerInfo,
    offerings,
    isLoading,
    isConfigured,
    isPurchasing,
    isRestoring,
    isSubscribed,
    isVerified, // ✅ Included so opportunities.tsx works correctly
    purchase,
    restore,
    refetchCustomerInfo,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}