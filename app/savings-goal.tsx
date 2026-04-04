import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getTotalCashback } from "@/lib/storage";

const GOAL_KEY = "r2b_savings_goal";

interface SavingsGoal {
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  createdAt: number;
}

const PRESET_GOALS = [
  { label: "$25/mo", amount: 25, period: "monthly" as const },
  { label: "$50/mo", amount: 50, period: "monthly" as const },
  { label: "$100/mo", amount: 100, period: "monthly" as const },
  { label: "$200/mo", amount: 200, period: "monthly" as const },
  { label: "$500/yr", amount: 500, period: "yearly" as const },
  { label: "$1000/yr", amount: 1000, period: "yearly" as const },
];

export default function SavingsGoalScreen() {
  const colors = useColors();
  const router = useRouter();
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [inputAmount, setInputAmount] = useState("");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [totals, setTotals] = useState({ week: 0, month: 0, year: 0, allTime: 0 });
  const [editing, setEditing] = useState(false);

  const loadData = useCallback(async () => {
    const [raw, cashback] = await Promise.all([
      AsyncStorage.getItem(GOAL_KEY),
      getTotalCashback(),
    ]);
    if (raw) setGoal(JSON.parse(raw));
    setTotals(cashback);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveGoal = async () => {
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid savings goal amount.");
      return;
    }
    const newGoal: SavingsGoal = { amount, period, createdAt: Date.now() };
    await AsyncStorage.setItem(GOAL_KEY, JSON.stringify(newGoal));
    setGoal(newGoal);
    setEditing(false);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteGoal = async () => {
    Alert.alert("Delete Goal", "Remove your savings goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(GOAL_KEY);
          setGoal(null);
          setInputAmount("");
        },
      },
    ]);
  };

  const getCurrentProgress = () => {
    if (!goal) return 0;
    if (goal.period === "weekly") return totals.week;
    if (goal.period === "monthly") return totals.month;
    return totals.year;
  };

  const getProgressPercent = () => {
    if (!goal) return 0;
    return Math.min((getCurrentProgress() / goal.amount) * 100, 100);
  };

  const getMotivationMessage = () => {
    const pct = getProgressPercent();
    if (pct >= 100) return "🎉 Goal achieved! Amazing work!";
    if (pct >= 75) return "🔥 Almost there! Keep it up!";
    if (pct >= 50) return "💪 Halfway there! You're doing great!";
    if (pct >= 25) return "👍 Good start! Keep saving!";
    return "🚀 Every dollar counts!";
  };

  const s = StyleSheet.create({
    card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
    progressTrack: { height: 12, borderRadius: 6, overflow: "hidden", marginVertical: 12 },
    progressFill: { height: "100%", borderRadius: 6 },
    periodRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
    periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
    presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
    presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    saveBtn: { height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    statRow: { flexDirection: "row", justifyContent: "space-around" },
    statBox: { alignItems: "center" },
    statValue: { fontSize: 22, fontWeight: "700" },
    statLabel: { fontSize: 11, marginTop: 2 },
  });

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 12 }]}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={22} color={colors.primary} />
        </Pressable>
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground }}>Savings Goal</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Current Savings Summary */}
        <View style={[s.card, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.success, marginBottom: 12 }}>Your Savings So Far</Text>
          <View style={s.statRow}>
            <View style={s.statBox}>
              <Text style={[s.statValue, { color: colors.success }]}>${totals.week.toFixed(2)}</Text>
              <Text style={[s.statLabel, { color: colors.muted }]}>This Week</Text>
            </View>
            <View style={[{ width: 1, height: 40, backgroundColor: colors.border }]} />
            <View style={s.statBox}>
              <Text style={[s.statValue, { color: colors.success }]}>${totals.month.toFixed(2)}</Text>
              <Text style={[s.statLabel, { color: colors.muted }]}>This Month</Text>
            </View>
            <View style={[{ width: 1, height: 40, backgroundColor: colors.border }]} />
            <View style={s.statBox}>
              <Text style={[s.statValue, { color: colors.success }]}>${totals.allTime.toFixed(2)}</Text>
              <Text style={[s.statLabel, { color: colors.muted }]}>All Time</Text>
            </View>
          </View>
        </View>

        {/* Goal Progress */}
        {goal && !editing && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                ${goal.amount.toFixed(0)} / {goal.period}
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={() => { setInputAmount(goal.amount.toString()); setPeriod(goal.period); setEditing(true); }}>
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Edit</Text>
                </Pressable>
                <Pressable onPress={deleteGoal}>
                  <Text style={{ color: colors.error, fontSize: 14, fontWeight: "600" }}>Delete</Text>
                </Pressable>
              </View>
            </View>
            <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[s.progressFill, { backgroundColor: getProgressPercent() >= 100 ? colors.success : colors.primary, width: `${getProgressPercent()}%` as any }]} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: colors.muted }}>${getCurrentProgress().toFixed(2)} saved</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: getProgressPercent() >= 100 ? colors.success : colors.primary }}>
                {getProgressPercent().toFixed(0)}%
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.foreground, marginTop: 12, textAlign: "center" }}>
              {getMotivationMessage()}
            </Text>
            {getProgressPercent() < 100 && (
              <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 4 }}>
                ${(goal.amount - getCurrentProgress()).toFixed(2)} more to reach your goal
              </Text>
            )}
          </View>
        )}

        {/* Set / Edit Goal */}
        {(!goal || editing) && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 16 }}>
              {editing ? "Edit Goal" : "Set a Savings Goal"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>Period</Text>
            <View style={s.periodRow}>
              {(["weekly", "monthly", "yearly"] as const).map((p) => (
                <Pressable
                  key={p}
                  style={({ pressed }) => [
                    s.periodBtn,
                    {
                      backgroundColor: period === p ? colors.primary + "15" : colors.background,
                      borderColor: period === p ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: period === p ? colors.primary : colors.muted, textTransform: "capitalize" }}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>Quick Presets</Text>
            <View style={s.presetRow}>
              {PRESET_GOALS.filter((g) => g.period === period).map((preset) => (
                <Pressable
                  key={preset.label}
                  style={({ pressed }) => [
                    s.presetChip,
                    {
                      backgroundColor: inputAmount === preset.amount.toString() ? colors.primary + "15" : colors.background,
                      borderColor: inputAmount === preset.amount.toString() ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => setInputAmount(preset.amount.toString())}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: inputAmount === preset.amount.toString() ? colors.primary : colors.foreground }}>
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>Custom Amount ($)</Text>
            <TextInput
              style={{ height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 18, fontWeight: "700", backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, marginBottom: 16 }}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              value={inputAmount}
              onChangeText={setInputAmount}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              {editing && (
                <Pressable
                  style={({ pressed }) => [s.saveBtn, { flex: 1, backgroundColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => setEditing(false)}
                >
                  <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600" }}>Cancel</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [s.saveBtn, { flex: 2, backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                onPress={saveGoal}
              >
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                  {editing ? "Update Goal" : "Set Goal"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={[s.card, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "20" }]}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 8 }}>💡 Savings Tips</Text>
          {[
            "Use coupons before every shopping trip",
            "Compare unit prices to find the best value",
            "Buy store brands instead of name brands",
            "Plan meals to avoid impulse purchases",
            "Track cashback from Ibotta, Fetch & Rakuten",
          ].map((tip, i) => (
            <Text key={i} style={{ fontSize: 13, color: colors.muted, marginBottom: 4 }}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
