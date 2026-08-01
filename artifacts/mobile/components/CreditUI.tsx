import { useCredits } from "@/context/CreditContext";
import { TOOL_COSTS, type ToolKey } from "@/lib/toolCosts";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function CreditBalancePill() {
  const colors = useColors();
  const { balance, dailyLimit, isUnlimited } = useCredits();
  return (
    <View style={[styles.balancePill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.balanceText, { color: colors.primary }]}>
        {isUnlimited ? "∞ Unlimited credits" : `${balance}/${dailyLimit} credits today`}
      </Text>
    </View>
  );
}

export function ToolCreditPill({ tool }: { tool: ToolKey }) {
  const colors = useColors();
  const { balance, dailyLimit, isUnlimited } = useCredits();
  const info = TOOL_COSTS[tool];
  const creditWord = info.cost === 1 ? "credit" : "credits";
  return (
    <View style={[styles.toolPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.toolText, { color: colors.primary }]}>
        {isUnlimited
          ? `Unlimited • ${info.cost} ${creditWord}/${info.unit}`
          : `${balance}/${dailyLimit} left • ${info.cost} ${creditWord}/${info.unit}`}
      </Text>
    </View>
  );
}

export function ToolCreditLabel({ tool }: { tool: ToolKey }) {
  const { isUnlimited } = useCredits();
  const info = TOOL_COSTS[tool];
  const creditWord = info.cost === 1 ? "credit" : "credits";
  return (
    <Text style={styles.cardCost}>
      {isUnlimited ? "Unlimited" : `${info.cost} ${creditWord}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  balancePill: {
    alignSelf: "flex-start",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  balanceText: { fontSize: 12, fontWeight: "700" },
  toolPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  toolText: { fontSize: 11, fontWeight: "700" },
  cardCost: { fontSize: 11, fontWeight: "700", opacity: 0.75 },
});