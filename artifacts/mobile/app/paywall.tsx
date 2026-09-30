import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import type { PurchasesPackage } from "react-native-purchases";

import { useSubscription } from "@/lib/revenuecat";

type PlanType = "monthly" | "yearly";

const WEB_MONTHLY_PRICE = "$3";
const WEB_YEARLY_PRICE = "$10";

export default function PaywallScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      feature?: string;
    }>();

  const {
    offerings,
    isLoading,
    isPurchasing,
    isRestoring,
    isSubscribed,
    purchase,
    restore,
    activateWebPreviewPro,
  } = useSubscription();

  const [selectedPlan, setSelectedPlan] =
    useState<PlanType>("monthly");

  const [statusMessage, setStatusMessage] =
    useState<string>("");

  const [statusType, setStatusType] =
    useState<"info" | "success" | "error">(
      "info"
    );

  /*
   * Get the RevenueCat package for the selected plan.
   *
   * RevenueCat normally provides:
   *   MONTHLY
   *   ANNUAL
   *
   * We also check package identifiers/product identifiers
   * so this continues working with custom package setups.
   */
  const selectedPackage =
    useMemo<PurchasesPackage | null>(() => {
      if (!offerings) {
        return null;
      }

      const packages =
        offerings.availablePackages || [];

      if (selectedPlan === "monthly") {
        return (
          packages.find(
            (pkg) =>
              pkg.packageType === "MONTHLY"
          ) ||
          packages.find((pkg) =>
            pkg.identifier
              .toLowerCase()
              .includes("monthly")
          ) ||
          packages.find((pkg) =>
            pkg.product.identifier
              .toLowerCase()
              .includes("month")
          ) ||
          null
        );
      }

      return (
        packages.find(
          (pkg) =>
            pkg.packageType === "ANNUAL"
        ) ||
        packages.find((pkg) =>
          pkg.identifier
            .toLowerCase()
            .includes("annual")
        ) ||
        packages.find((pkg) =>
          pkg.identifier
            .toLowerCase()
            .includes("year")
        ) ||
        packages.find((pkg) =>
          pkg.product.identifier
            .toLowerCase()
            .includes("year")
        ) ||
        null
      );
    }, [offerings, selectedPlan]);

  /*
   * If the user is already subscribed, show that state.
   */
  useEffect(() => {
    if (isSubscribed) {
      setStatusType("success");
      setStatusMessage(
        Platform.OS === "web"
          ? "Pro Preview is active. Your credits are unlimited."
          : "Pro is active. Your credits are unlimited."
      );
    }
  }, [isSubscribed]);

  const showStatus = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const handlePurchase = async () => {
    console.log(
      "[Paywall] Continue button pressed"
    );

    /*
     * WEB PREVIEW
     *
     * This does NOT make a real purchase.
     * It simply activates the development-only
     * Pro preview so the entire premium UI can
     * be tested in a browser.
     */
    if (Platform.OS === "web") {
      console.log(
        "[Paywall] Web preview purchase button pressed"
      );

      activateWebPreviewPro();

      showStatus(
        "Pro Preview activated! Your credits are now unlimited. This is a browser development preview — no real payment was made.",
        "success"
      );

      return;
    }

    /*
     * NATIVE
     *
     * Native Android/iOS must have a RevenueCat package.
     */
    if (!selectedPackage) {
      showStatus(
        "No RevenueCat package is available. Check your RevenueCat offering and product configuration.",
        "error"
      );

      console.error(
        "[Paywall] No selected RevenueCat package."
      );

      return;
    }

    try {
      showStatus(
        "Opening the purchase screen...",
        "info"
      );

      const customerInfo =
        await purchase(selectedPackage);

      if (!customerInfo) {
        /*
         * Purchase was cancelled or failed.
         * The RevenueCat provider already logs
         * the detailed error.
         */
        showStatus(
          "The purchase was not completed.",
          "info"
        );

        return;
      }

      const proActive =
        Boolean(
          customerInfo.entitlements.active[
            "pro"
          ]
        );

      console.log(
        "[Paywall] Pro entitlement after purchase:",
        proActive
      );

      if (proActive) {
        showStatus(
          "Pro activated! Your credits are now unlimited.",
          "success"
        );

        /*
         * Give React a moment to update the provider
         * before returning to the app.
         */
        setTimeout(() => {
          router.back();
        }, 900);
      } else {
        showStatus(
          "The purchase completed, but the Pro entitlement is not active. Check your RevenueCat entitlement configuration.",
          "error"
        );
      }
    } catch (error) {
      console.error(
        "[Paywall] Purchase error:",
        error
      );

      showStatus(
        "Something went wrong while processing the purchase.",
        "error"
      );
    }
  };

  const handleRestore = async () => {
    console.log(
      "[Paywall] Restore Purchases pressed"
    );

    try {
      if (Platform.OS === "web") {
        activateWebPreviewPro();

        showStatus(
          "Pro Preview restored for this browser. Your credits are now unlimited.",
          "success"
        );

        return;
      }

      showStatus(
        "Restoring your purchases...",
        "info"
      );

      const customerInfo =
        await restore();

      if (!customerInfo) {
        showStatus(
          "No purchases were restored.",
          "info"
        );

        return;
      }

      const proActive =
        Boolean(
          customerInfo.entitlements.active[
            "pro"
          ]
        );

      if (proActive) {
        showStatus(
          "Pro restored successfully. Your credits are now unlimited.",
          "success"
        );

        setTimeout(() => {
          router.back();
        }, 900);
      } else {
        showStatus(
          "No active Pro entitlement was found.",
          "info"
        );
      }
    } catch (error) {
      console.error(
        "[Paywall] Restore error:",
        error
      );

      showStatus(
        "Something went wrong while restoring your purchase.",
        "error"
      );
    }
  };

  const handleFreePlan = () => {
    console.log(
      "[Paywall] Continue with free plan"
    );

    router.replace("/(tabs)");
  };

  const monthlyPrice =
    Platform.OS === "web"
      ? WEB_MONTHLY_PRICE
      : offerings
        ? (() => {
            const pkg =
              offerings.availablePackages.find(
                (item) =>
                  item.packageType === "MONTHLY"
              );

            return (
              pkg?.product.priceString ||
              WEB_MONTHLY_PRICE
            );
          })()
        : WEB_MONTHLY_PRICE;

  const yearlyPrice =
    Platform.OS === "web"
      ? WEB_YEARLY_PRICE
      : offerings
        ? (() => {
            const pkg =
              offerings.availablePackages.find(
                (item) =>
                  item.packageType === "ANNUAL"
              );

            return (
              pkg?.product.priceString ||
              WEB_YEARLY_PRICE
            );
          })()
        : WEB_YEARLY_PRICE;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Close */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.closeText}>
              ✕
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>
                PRO
              </Text>
            </View>

            <Text style={styles.title}>
              Unlock Improkinz Pro
            </Text>

            <Text style={styles.subtitle}>
              Get unlimited access to your study
              tools without worrying about daily
              credits.
            </Text>

            {params.feature ? (
              <Text style={styles.featureText}>
                Unlocking: {params.feature}
              </Text>
            ) : null}
          </View>

          {/* Benefits */}
          <View style={styles.benefitsCard}>
            <Benefit
              icon="∞"
              title="Unlimited credits"
              description="Use your AI study tools without the daily 100-credit limit."
            />

            <Benefit
              icon="⚡"
              title="More AI study tools"
              description="Keep studying without constantly waiting for credits to reset."
            />

            <Benefit
              icon="🚀"
              title="Study without interruptions"
              description="Focus on learning instead of managing your credit balance."
            />

            <Benefit
              icon="✨"
              title="Premium experience"
              description="Unlock the full Pro experience across Improkinz."
            />
          </View>

          {/* Already Pro */}
          {isSubscribed ? (
            <View
              style={[
                styles.statusBox,
                styles.successBox,
              ]}
            >
              <Text
                style={styles.statusTitle}
              >
                ✓ Pro is active
              </Text>

              <Text
                style={styles.statusMessage}
              >
                Your credits are unlimited.
              </Text>
            </View>
          ) : null}

          {/* Plans */}
          {!isSubscribed ? (
            <>
              <Text style={styles.sectionTitle}>
                Choose your plan
              </Text>

              <View style={styles.plans}>
                {/* Monthly */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.plan,
                    selectedPlan ===
                      "monthly" &&
                      styles.selectedPlan,
                  ]}
                  onPress={() =>
                    setSelectedPlan(
                      "monthly"
                    )
                  }
                >
                  <View
                    style={
                      styles.planRadioOuter
                    }
                  >
                    {selectedPlan ===
                    "monthly" ? (
                      <View
                        style={
                          styles.planRadioInner
                        }
                      />
                    ) : null}
                  </View>

                  <View
                    style={styles.planInfo}
                  >
                    <Text
                      style={
                        styles.planTitle
                      }
                    >
                      Monthly
                    </Text>

                    <Text
                      style={
                        styles.planDescription
                      }
                    >
                      Flexible monthly access
                    </Text>
                  </View>

                  <View
                    style={
                      styles.priceContainer
                    }
                  >
                    <Text
                      style={
                        styles.planPrice
                      }
                    >
                      {monthlyPrice}
                    </Text>

                    <Text
                      style={
                        styles.pricePeriod
                      }
                    >
                      /month
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Yearly */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.plan,
                    selectedPlan ===
                      "yearly" &&
                      styles.selectedPlan,
                  ]}
                  onPress={() =>
                    setSelectedPlan(
                      "yearly"
                    )
                  }
                >
                  <View
                    style={
                      styles.planRadioOuter
                    }
                  >
                    {selectedPlan ===
                    "yearly" ? (
                      <View
                        style={
                          styles.planRadioInner
                        }
                      />
                    ) : null}
                  </View>

                  <View
                    style={styles.planInfo}
                  >
                    <Text
                      style={
                        styles.planTitle
                      }
                    >
                      Yearly
                    </Text>

                    <Text
                      style={
                        styles.planDescription
                      }
                    >
                      Full year of Pro access
                    </Text>
                  </View>

                  <View
                    style={
                      styles.priceContainer
                    }
                  >
                    <Text
                      style={
                        styles.planPrice
                      }
                    >
                      {yearlyPrice}
                    </Text>

                    <Text
                      style={
                        styles.pricePeriod
                      }
                    >
                      /year
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Main purchase button */}
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={
                  isPurchasing ||
                  isLoading
                }
                style={[
                  styles.continueButton,
                  (isPurchasing ||
                    isLoading) &&
                    styles.disabledButton,
                ]}
                onPress={handlePurchase}
              >
                {isPurchasing ? (
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                  />
                ) : (
                  <Text
                    style={
                      styles.continueButtonText
                    }
                  >
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              {/* Restore */}
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isRestoring}
                style={styles.restoreButton}
                onPress={handleRestore}
              >
                {isRestoring ? (
                  <ActivityIndicator
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      styles.restoreText
                    }
                  >
                    Restore Purchases
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {/* Status */}
          {statusMessage ? (
            <View
              style={[
                styles.statusBox,
                statusType === "success" &&
                  styles.successBox,
                statusType === "error" &&
                  styles.errorBox,
                statusType === "info" &&
                  styles.infoBox,
              ]}
            >
              <Text
                style={styles.statusMessage}
              >
                {statusMessage}
              </Text>
            </View>
          ) : null}

          {/* Web preview note */}
          {Platform.OS === "web" ? (
            <View
              style={styles.previewNotice}
            >
              <Text
                style={styles.previewTitle}
              >
                Browser Preview
              </Text>

              <Text
                style={styles.previewText}
              >
                You are running Improkinz in
                Expo Web. Continue activates a
                development-only Pro preview so
                you can test unlimited credits.
                No real payment is processed in
                the browser.
              </Text>
            </View>
          ) : null}

          {/* Free plan */}
          {!isSubscribed ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.freeButton}
              onPress={handleFreePlan}
            >
              <Text
                style={styles.freeButtonText}
              >
                Continue with free plan
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.freeButton}
              onPress={() =>
                router.replace("/(tabs)")
              }
            >
              <Text
                style={styles.freeButtonText}
              >
                Back to Improkinz
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.terms}>
            Subscriptions are managed through
            RevenueCat on supported native
            platforms. Browser preview mode is
            for development/testing only.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.benefit}>
      <View style={styles.benefitIcon}>
        <Text style={styles.benefitIconText}>
          {icon}
        </Text>
      </View>

      <View style={styles.benefitContent}>
        <Text style={styles.benefitTitle}>
          {title}
        </Text>

        <Text
          style={styles.benefitDescription}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090612",
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  container: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  closeButton: {
    alignSelf: "flex-end",
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#191226",
    marginBottom: 8,
  },

  closeText: {
    color: "#aaa0bc",
    fontSize: 20,
    fontWeight: "600",
  },

  header: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 26,
  },

  proBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#7c3aed",
    marginBottom: 14,
  },

  proBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },

  title: {
    color: "#ffffff",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: "#aaa0bc",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 500,
  },

  featureText: {
    color: "#a78bfa",
    fontSize: 13,
    marginTop: 12,
    fontWeight: "600",
  },

  benefitsCard: {
    backgroundColor: "#120c1e",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#251b35",
    marginBottom: 24,
  },

  benefit: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  benefitLast: {
    marginBottom: 0,
  },

  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#211433",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  benefitIconText: {
    color: "#c4b5fd",
    fontSize: 20,
  },

  benefitContent: {
    flex: 1,
  },

  benefitTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },

  benefitDescription: {
    color: "#91859f",
    fontSize: 13,
    lineHeight: 19,
  },

  sectionTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },

  plans: {
    gap: 12,
  },

  plan: {
    minHeight: 82,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2a2038",
    backgroundColor: "#120c1e",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  selectedPlan: {
    borderColor: "#8b5cf6",
    backgroundColor: "#18102a",
  },

  planRadioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#655777",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  planRadioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#8b5cf6",
  },

  planInfo: {
    flex: 1,
  },

  planTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },

  planDescription: {
    color: "#8f849c",
    fontSize: 12,
    marginTop: 3,
  },

  priceContainer: {
    alignItems: "flex-end",
  },

  planPrice: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },

  pricePeriod: {
    color: "#8f849c",
    fontSize: 11,
    marginTop: 2,
  },

  continueButton: {
    height: 56,
    borderRadius: 17,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  disabledButton: {
    opacity: 0.6,
  },

  continueButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  restoreButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  restoreText: {
    color: "#a78bfa",
    fontSize: 14,
    fontWeight: "600",
  },

  statusBox: {
    borderRadius: 15,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
  },

  successBox: {
    backgroundColor: "#102018",
    borderColor: "#245d3c",
  },

  errorBox: {
    backgroundColor: "#241217",
    borderColor: "#71303b",
  },

  infoBox: {
    backgroundColor: "#151125",
    borderColor: "#332758",
  },

  statusTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  statusMessage: {
    color: "#c7bed2",
    fontSize: 13,
    lineHeight: 19,
  },

  previewNotice: {
    backgroundColor: "#171126",
    borderRadius: 15,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#30244b",
  },

  previewTitle: {
    color: "#c4b5fd",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 5,
  },

  previewText: {
    color: "#91859f",
    fontSize: 12,
    lineHeight: 18,
  },

  freeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 8,
  },

  freeButtonText: {
    color: "#8f849c",
    fontSize: 14,
    fontWeight: "600",
  },

  terms: {
    color: "#61576d",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
