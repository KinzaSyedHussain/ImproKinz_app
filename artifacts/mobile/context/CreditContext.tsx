import { useSubscription } from "@/lib/revenuecat";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, runTransaction, updateDoc } from "firebase/firestore";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { TOOL_COSTS, type ToolKey } from "@/lib/toolCosts";

export const DAILY_CREDIT_LIMIT = 100;

interface CreditContextValue {
  balance: number;
  dailyLimit: number;
  isUnlimited: boolean;
  isLoading: boolean;
  spendCredits: (amount: number) => Promise<boolean>;
  refundCredits: (amount: number) => Promise<void>;
  consumeTool: (tool: ToolKey) => Promise<boolean>;
}

const CreditContext = createContext<CreditContextValue | null>(null);

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const [balance, setBalance] = useState(DAILY_CREDIT_LIMIT);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const syncDailyCredits = useCallback(async () => {
    if (!user) {
      setBalance(DAILY_CREDIT_LIMIT);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const ref = doc(db, "profiles", user.uid);
      const today = dayKey();
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      const nextBalance =
        data.creditsDate === today
          ? Math.max(0, Number(data.creditsBalance ?? DAILY_CREDIT_LIMIT))
          : DAILY_CREDIT_LIMIT;

      if (data.creditsDate !== today || data.creditsBalance === undefined) {
        await updateDoc(ref, {
          creditsBalance: nextBalance,
          creditsDate: today,
        }).catch(() => {});
      }
      setBalance(nextBalance);
    } catch (error) {
      console.warn("Credit balance sync failed:", error);
      setBalance(DAILY_CREDIT_LIMIT);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    syncDailyCredits();
  }, [syncDailyCredits]);

  const spendCredits = useCallback(async (amount: number) => {
    if (isSubscribed) return true;
    if (!user || amount <= 0) return false;

    const ref = doc(db, "profiles", user.uid);
    const today = dayKey();
    try {
      const nextBalance = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        const data = snap.exists() ? snap.data() : {};
        const current =
          data.creditsDate === today
            ? Math.max(0, Number(data.creditsBalance ?? DAILY_CREDIT_LIMIT))
            : DAILY_CREDIT_LIMIT;

        if (current < amount) return null;

        const next = current - amount;
        transaction.set(
          ref,
          { creditsBalance: next, creditsDate: today },
          { merge: true },
        );
        return next;
      });

      if (nextBalance === null) return false;
      setBalance(nextBalance);
      return true;
    } catch (error) {
      console.warn("Credit spend failed:", error);
      return false;
    }
  }, [isSubscribed, user?.uid]);

  const refundCredits = useCallback(async (amount: number) => {
    if (isSubscribed || !user || amount <= 0) return;

    const ref = doc(db, "profiles", user.uid);
    const today = dayKey();
    try {
      const nextBalance = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        const data = snap.exists() ? snap.data() : {};
        const current =
          data.creditsDate === today
            ? Math.max(0, Number(data.creditsBalance ?? 0))
            : 0;
        const next = Math.min(DAILY_CREDIT_LIMIT, current + amount);
        transaction.set(
          ref,
          { creditsBalance: next, creditsDate: today },
          { merge: true },
        );
        return next;
      });
      setBalance(nextBalance);
    } catch (error) {
      console.warn("Credit refund failed:", error);
    }
  }, [isSubscribed, user?.uid]);

  const consumeTool = useCallback(async (tool: ToolKey) => {
    const cost = TOOL_COSTS[tool].cost;
    const allowed = await spendCredits(cost);
    if (allowed) return true;

    Alert.alert(
      "You're out of credits",
      `You need ${cost} credits for ${TOOL_COSTS[tool].label}. Your free credits reset daily.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "View Premium", onPress: () => router.push("/paywall") },
      ],
    );
    return false;
  }, [router, spendCredits]);

  const value = useMemo(() => ({
    balance,
    dailyLimit: DAILY_CREDIT_LIMIT,
    isUnlimited: isSubscribed,
    isLoading,
    spendCredits,
    refundCredits,
    consumeTool,
  }), [balance, consumeTool, isLoading, isSubscribed, refundCredits, spendCredits]);

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
}

export function useCredits() {
  const context = useContext(CreditContext);
  if (!context) throw new Error("useCredits must be used within a CreditProvider");
  return context;
}