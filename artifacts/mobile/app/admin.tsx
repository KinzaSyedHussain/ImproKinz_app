import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

// ── API base ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GroupItem {
  id: string;
  name: string;
  memberCount: number;
  createdBy: string;
}

interface ReportItem {
  id: string;
  reportedBy: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: any;
  resolved: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAdmin, profile } = useAuth();
  const { getToken } = useClerkAuth();

  const [tab, setTab] = useState<"groups" | "reports">("groups");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // ── Authenticated API helper ──────────────────────────────────────────────

  const apiCall = useCallback(
    async (path: string, method: string = "GET") => {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [getToken],
  );

  // ── Data fetching via Clerk-verified admin endpoints ──────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gData, rData] = await Promise.all([
        apiCall("/admin/groups", "GET"),
        apiCall("/admin/reports", "GET"),
      ]);
      setGroups(gData.groups ?? []);
      setReports(rData.reports ?? []);
    } catch (e) {
      console.warn("admin fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // ── Access guard ──────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Icon name="shield-x" size={48} color={colors.destructive} />
        <Text style={[styles.noAccessText, { color: colors.foreground }]}>Access denied</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Admin actions — routed through API server (server-side auth check) ─────

  const deleteGroup = (group: GroupItem) => {
    Alert.alert(
      "Delete Group",
      `Delete "${group.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading((p) => ({ ...p, [group.id]: true }));
            try {
              await apiCall(`/admin/groups/${group.id}`, "DELETE");
              setGroups((prev) => prev.filter((g) => g.id !== group.id));
            } catch (e: any) {
              Alert.alert("Error", e?.message);
            } finally {
              setActionLoading((p) => ({ ...p, [group.id]: false }));
            }
          },
        },
      ],
    );
  };

  const resolveReport = async (report: ReportItem) => {
    setActionLoading((p) => ({ ...p, [report.id]: true }));
    try {
      await apiCall(`/admin/reports/${report.id}/resolve`, "PATCH");
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e: any) {
      Alert.alert("Error", e?.message);
    } finally {
      setActionLoading((p) => ({ ...p, [report.id]: false }));
    }
  };

  const suspendUser = (targetId: string) => {
    Alert.alert("Suspend User", `Suspend user ${targetId.slice(0, 16)}…?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Suspend",
        style: "destructive",
        onPress: async () => {
          try {
            await apiCall(`/admin/users/${targetId}/suspend`, "PATCH");
            Alert.alert("Done", "User suspended.");
          } catch (e: any) {
            Alert.alert("Error", e?.message);
          }
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.purpleStart, colors.background]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Admin Panel</Text>
            <Text style={[styles.headerSub, { color: "#ffffff88" }]}>
              Signed in as {profile?.email}
            </Text>
          </View>
          <View style={[styles.adminBadge, { backgroundColor: colors.destructive + "33" }]}>
            <Icon name="shield" size={14} color={colors.destructive} />
            <Text style={[styles.adminBadgeText, { color: colors.destructive }]}>Admin</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(["groups", "reports"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tabBtn,
                tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setTab(t)}
            >
              <Text
                style={[styles.tabLabel, { color: tab === t ? colors.primary : "#ffffff88" }]}
              >
                {t === "groups" ? `Groups (${groups.length})` : `Reports (${reports.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : tab === "groups" ? (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item: group }) => (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{group.name}</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                  {group.memberCount || 0} members
                </Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.muted }]}
                  onPress={() => router.push(`/group/${group.id}` as any)}
                >
                  <Icon name="eye" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.destructive + "22" }]}
                  onPress={() => deleteGroup(group)}
                  disabled={actionLoading[group.id]}
                >
                  {actionLoading[group.id] ? (
                    <ActivityIndicator size="small" color={colors.destructive} />
                  ) : (
                    <Icon name="trash-2" size={15} color={colors.destructive} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No groups yet
              </Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item: report }) => (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.reportTypeRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          report.targetType === "post"
                            ? colors.accent + "33"
                            : colors.warning + "33",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        {
                          color:
                            report.targetType === "post" ? colors.accent : colors.warning,
                        },
                      ]}
                    >
                      {report.targetType}
                    </Text>
                  </View>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                    {report.reason}
                  </Text>
                </View>
                <Text style={[styles.cardSub, { color: colors.mutedForeground, marginTop: 4 }]}>
                  Target: {report.targetId?.slice(0, 18)}…
                </Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                  By: {report.reportedBy?.slice(0, 18)}…
                </Text>
              </View>
              <View style={styles.cardActions}>
                {report.targetType === "user" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.warning + "22" }]}
                    onPress={() => suspendUser(report.targetId)}
                  >
                    <Icon name="user-x" size={15} color={colors.warning} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.success + "22" }]}
                  onPress={() => resolveReport(report)}
                  disabled={actionLoading[report.id]}
                >
                  {actionLoading[report.id] ? (
                    <ActivityIndicator size="small" color={colors.success} />
                  ) : (
                    <Icon name="check" size={15} color={colors.success} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Icon name="check-circle" size={40} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 12 }]}>
                No open reports
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  adminBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ffffff22" },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reportTypeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  noAccessText: { fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 16, marginBottom: 8 },
});
