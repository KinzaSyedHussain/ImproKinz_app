import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  PurchasesOffering,
} from "react-native-purchases";

export const PRO_ENTITLEMENT_ID = "pro";
export const VERIFICATION_ENTITLEMENT_ID = "verified";

const WEB_PREVIEW_STORAGE_KEY = "improkinz_web_preview_pro";

const ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
const IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const TEST_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;

const USE_TEST_STORE =
  process.env.EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE === "true";

type SubscriptionContextType = {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;

  isLoading: boolean;
  isConfigured: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;

  isSubscribed: boolean;
  isVerified: boolean;

  purchase: (
    pkg: PurchasesPackage
  ) => Promise<CustomerInfo | null>;

  restore: () => Promise<CustomerInfo | null>;

  refreshCustomerInfo: () => Promise<CustomerInfo | null>;

  activateWebPreviewPro: () => void;
  deactivateWebPreviewPro: () => void;

  webPreviewPro: boolean;
};

const SubscriptionContext =
  createContext<SubscriptionContextType | undefined>(undefined);

function getRevenueCatApiKey(): string | null {
  if (Platform.OS === "android") {
    return USE_TEST_STORE
      ? TEST_API_KEY || null
      : ANDROID_API_KEY || null;
  }

  if (Platform.OS === "ios") {
    return USE_TEST_STORE
      ? TEST_API_KEY || null
      : IOS_API_KEY || null;
  }

  return null;
}

function hasProEntitlement(
  info: CustomerInfo | null
): boolean {
  return Boolean(
    info?.entitlements?.active?.[PRO_ENTITLEMENT_ID]
  );
}

function hasVerificationEntitlement(
  info: CustomerInfo | null
): boolean {
  return Boolean(
    info?.entitlements?.active?.[
      VERIFICATION_ENTITLEMENT_ID
    ]
  );
}

async function initializeRevenueCat(): Promise<boolean> {
  if (Platform.OS === "web") {
    console.log(
      "RevenueCat: Web platform detected. Native SDK not configured."
    );
    return false;
  }

  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    console.warn(
      "RevenueCat: No public API key configured for this platform."
    );
    return false;
  }

  if (apiKey.startsWith("sk_")) {
    console.error(
      "RevenueCat: A SECRET API key was provided to the mobile app. Do not use secret keys here."
    );
    return false;
  }

  try {
    Purchases.configure({
      apiKey,
    });

    console.log("RevenueCat: SDK configured.");
    console.log(
      "RevenueCat: Platform:",
      Platform.OS
    );
    console.log(
      "RevenueCat: Test Store:",
      USE_TEST_STORE
    );

    return true;
  } catch (error) {
    console.error(
      "RevenueCat: Failed to configure SDK:",
      error
    );

    return false;
  }
}

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customerInfo, setCustomerInfo] =
    useState<CustomerInfo | null>(null);

  const [offerings, setOfferings] =
    useState<PurchasesOffering | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isConfigured, setIsConfigured] =
    useState(false);

  const [isPurchasing, setIsPurchasing] =
    useState(false);

  const [isRestoring, setIsRestoring] =
    useState(false);

  const [webPreviewPro, setWebPreviewPro] =
    useState(false);

  /*
   * Load the web preview Pro state.
   *
   * This is ONLY for browser development/testing.
   * It does not create a RevenueCat entitlement.
   */
  useEffect(() => {
    if (Platform.OS !== "web") {
      setWebPreviewPro(false);
      return;
    }

    try {
      const stored =
        window.localStorage.getItem(
          WEB_PREVIEW_STORAGE_KEY
        );

      setWebPreviewPro(stored === "true");

      console.log(
        "RevenueCat: Web preview Pro:",
        stored === "true"
      );
    } catch (error) {
      console.warn(
        "RevenueCat: Could not read web preview state:",
        error
      );
    }
  }, []);

  /*
   * Initialize RevenueCat on native platforms.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsLoading(true);

      if (Platform.OS === "web") {
        setIsConfigured(false);
        setIsLoading(false);

        console.log(
          "RevenueCat: Web preview detected."
        );

        console.log(
          "Web fallback prices:",
          {
            monthly: "$3",
            yearly: "$10",
          }
        );

        return;
      }

      try {
        const configured =
          await initializeRevenueCat();

        if (cancelled) {
          return;
        }

        setIsConfigured(configured);

        if (!configured) {
          setIsLoading(false);
          return;
        }

        const [info, currentOfferings] =
          await Promise.all([
            Purchases.getCustomerInfo(),
            Purchases.getOfferings(),
          ]);

        if (cancelled) {
          return;
        }

        setCustomerInfo(info);

        if (currentOfferings.current) {
          setOfferings(currentOfferings.current);

          console.log(
            "RevenueCat: Current Offering:",
            currentOfferings.current.identifier
          );

          console.log(
            "RevenueCat: Available Packages:",
            currentOfferings.current.availablePackages.map(
              (pkg) => ({
                identifier: pkg.identifier,
                packageType: pkg.packageType,
                productIdentifier:
                  pkg.product.identifier,
                price:
                  pkg.product.priceString,
              })
            )
          );
        } else {
          console.warn(
            "RevenueCat: No current offering found."
          );
        }

        console.log(
          "RevenueCat: Initial Active Entitlements:",
          Object.keys(
            info.entitlements.active
          )
        );

        console.log(
          "RevenueCat: Pro Entitlement Active:",
          hasProEntitlement(info)
        );

        console.log(
          "RevenueCat: Verification Entitlement Active:",
          hasVerificationEntitlement(info)
        );
      } catch (error) {
        console.error(
          "RevenueCat: Initialization error:",
          error
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Listen for RevenueCat customer-info changes.
   *
   * This is important because entitlement status can change
   * without the user manually pressing another button.
   */
  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !isConfigured
    ) {
      return;
    }

    const listener =
      (info: CustomerInfo) => {
        console.log(
          "RevenueCat: Customer info updated."
        );

        console.log(
          "RevenueCat: Active Entitlements:",
          Object.keys(
            info.entitlements.active
          )
        );

        console.log(
          "RevenueCat: Pro Entitlement Active:",
          hasProEntitlement(info)
        );

        setCustomerInfo(info);
      };

    Purchases.addCustomerInfoUpdateListener(
      listener
    );

    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(
          listener
        );
      } catch {
        // Older SDK versions may not expose
        // this cleanup method.
      }
    };
  }, [isConfigured]);

  /*
   * Activate the browser-only Pro preview.
   */
  const activateWebPreviewPro = useCallback(() => {
    if (Platform.OS !== "web") {
      return;
    }

    try {
      window.localStorage.setItem(
        WEB_PREVIEW_STORAGE_KEY,
        "true"
      );
    } catch (error) {
      console.warn(
        "RevenueCat: Could not save web preview state:",
        error
      );
    }

    setWebPreviewPro(true);

    console.log(
      "RevenueCat: WEB PREVIEW PRO ACTIVATED."
    );

    console.log(
      "RevenueCat: This is a development preview only. No real purchase was made."
    );
  }, []);

  /*
   * Deactivate the browser-only Pro preview.
   */
  const deactivateWebPreviewPro = useCallback(() => {
    if (Platform.OS !== "web") {
      return;
    }

    try {
      window.localStorage.removeItem(
        WEB_PREVIEW_STORAGE_KEY
      );
    } catch (error) {
      console.warn(
        "RevenueCat: Could not remove web preview state:",
        error
      );
    }

    setWebPreviewPro(false);

    console.log(
      "RevenueCat: WEB PREVIEW PRO DEACTIVATED."
    );
  }, []);

  /*
   * Refresh customer information from RevenueCat.
   */
  const refreshCustomerInfo =
    useCallback(async (): Promise<CustomerInfo | null> => {
      if (Platform.OS === "web") {
        console.log(
          "RevenueCat: Web preview does not use native customer info."
        );

        return null;
      }

      if (!isConfigured) {
        console.warn(
          "RevenueCat: Cannot refresh because SDK is not configured."
        );

        return null;
      }

      try {
        const info =
          await Purchases.getCustomerInfo();

        setCustomerInfo(info);

        console.log(
          "RevenueCat: Refreshed customer info."
        );

        console.log(
          "RevenueCat: Active Entitlements:",
          Object.keys(
            info.entitlements.active
          )
        );

        console.log(
          "RevenueCat: Pro Entitlement Active:",
          hasProEntitlement(info)
        );

        return info;
      } catch (error) {
        console.error(
          "RevenueCat: Failed to refresh customer info:",
          error
        );

        return null;
      }
    }, [isConfigured]);

  /*
   * Purchase a RevenueCat package.
   *
   * On Web, this activates the development-only preview.
   * On native, this performs the real RevenueCat purchase.
   */
  const purchase = useCallback(
    async (
      pkg: PurchasesPackage
    ): Promise<CustomerInfo | null> => {
      if (Platform.OS === "web") {
        console.log(
          "RevenueCat: Web preview purchase."
        );

        activateWebPreviewPro();

        return null;
      }

      if (!isConfigured) {
        console.error(
          "RevenueCat: Purchase attempted before SDK was configured."
        );

        return null;
      }

      try {
        setIsPurchasing(true);

        console.log(
          "RevenueCat: Starting purchase:",
          pkg.identifier
        );

        console.log(
          "RevenueCat: Product:",
          pkg.product.identifier
        );

        const result =
          await Purchases.purchasePackage(pkg);

        const info = result.customerInfo;

        setCustomerInfo(info);

        console.log(
          "RevenueCat: PURCHASE RESULT"
        );

        console.log(
          "RevenueCat: Active Entitlements:",
          Object.keys(
            info.entitlements.active
          )
        );

        console.log(
          "RevenueCat: Pro Entitlement Active:",
          hasProEntitlement(info)
        );

        console.log(
          "RevenueCat: Verification Entitlement Active:",
          hasVerificationEntitlement(info)
        );

        return info;
      } catch (error: any) {
        /*
         * RevenueCat uses PURCHASE_CANCELLED_ERROR
         * when the user cancels the native purchase sheet.
         */
        if (
          error?.userCancelled ||
          error?.code ===
            Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
        ) {
          console.log(
            "RevenueCat: User cancelled purchase."
          );
        } else {
          console.error(
            "RevenueCat: Purchase failed:",
            error
          );
        }

        return null;
      } finally {
        setIsPurchasing(false);
      }
    },
    [
      activateWebPreviewPro,
      isConfigured,
    ]
  );

  /*
   * Restore native RevenueCat purchases.
   */
  const restore =
    useCallback(async (): Promise<CustomerInfo | null> => {
      if (Platform.OS === "web") {
        console.log(
          "RevenueCat: Restoring Web Preview Pro."
        );

        activateWebPreviewPro();

        return null;
      }

      if (!isConfigured) {
        console.warn(
          "RevenueCat: Cannot restore because SDK is not configured."
        );

        return null;
      }

      try {
        setIsRestoring(true);

        const info =
          await Purchases.restorePurchases();

        setCustomerInfo(info);

        console.log(
          "RevenueCat: RESTORE RESULT"
        );

        console.log(
          "RevenueCat: Active Entitlements:",
          Object.keys(
            info.entitlements.active
          )
        );

        console.log(
          "RevenueCat: Pro Entitlement Active:",
          hasProEntitlement(info)
        );

        return info;
      } catch (error) {
        console.error(
          "RevenueCat: Restore failed:",
          error
        );

        return null;
      } finally {
        setIsRestoring(false);
      }
    }, [
      activateWebPreviewPro,
      isConfigured,
    ]);

  /*
   * Normal Pro subscription.
   *
   * On Web:
   *   webPreviewPro
   *
   * On Native:
   *   RevenueCat "pro" entitlement
   */
  const isSubscribed =
    Platform.OS === "web"
      ? webPreviewPro
      : hasProEntitlement(customerInfo);

  /*
   * IMPORTANT:
   *
   * Verification is intentionally NOT tied to Pro.
   * A normal Pro subscription should not automatically
   * make a user verified.
   */
  const isVerified =
    Platform.OS === "web"
      ? false
      : hasVerificationEntitlement(
          customerInfo
        );

  const contextValue =
    useMemo<SubscriptionContextType>(
      () => ({
        customerInfo,
        offerings,

        isLoading,
        isConfigured,
        isPurchasing,
        isRestoring,

        isSubscribed,
        isVerified,

        purchase,
        restore,
        refreshCustomerInfo,

        activateWebPreviewPro,
        deactivateWebPreviewPro,

        webPreviewPro,
      }),
      [
        customerInfo,
        offerings,
        isLoading,
        isConfigured,
        isPurchasing,
        isRestoring,
        isSubscribed,
        isVerified,
        purchase,
        restore,
        refreshCustomerInfo,
        activateWebPreviewPro,
        deactivateWebPreviewPro,
        webPreviewPro,
      ]
    );

  return (
    <SubscriptionContext.Provider
      value={contextValue}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context =
    useContext(SubscriptionContext);

  if (!context) {
    throw new Error(
      "useSubscription must be used inside SubscriptionProvider"
    );
  }

  return context;
}