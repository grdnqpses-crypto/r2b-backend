/**
 * Budget & Savings Screen
 * Trip logging, budget tracking, spending reports, savings goals
 */
import { useCallback, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, TextInput, Modal, FlatList,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getTripLogs, addTripLog, deleteTripLog,
  getBudgetSettings, saveBudgetSettings,
  getSavingsGoals, addSavingsGoal, updateSavingsGoal,
  getTier,
  type TripLog, type BudgetSettings, type SavingsGoal, type Tier,
} from "@/lib/storage";

type BudgetTab = "trips" | "budget" | "goals";

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getWeekStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

function getMonthStart(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function BudgetScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<BudgetTab>("trips");
  const [trips, setTrips] = useState<TripLog[]>([]);
  const [budget, setBudget] = useState<BudgetSettings>({ weeklyBudget: 0, monthlyBudget: 0, currency: "USD" });
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [tier, setTierState] = useState<Tier>("free");

  // Add Trip Modal
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [tripStore, setTripStore] = useState("");
  const [tripAmount, setTripAmount] = useState("");
  const [tripNote, setTripNote] = useState("");

  // Budget Edit Modal
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [editWeekly, setEditWeekly] = useState("");
  const [editMonthly, setEditMonthly] = useState("");

  // Add Goal Modal
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");

  const loadData = useCallback(async () => {
    const [tripsData, budgetData, goalsData, tierData] = await Promise.all([
      getTripLogs(), getBudgetSettings(), getSavingsGoals(), getTier(),
    ]);
    setTrips(tripsData);
    setBudget(budgetData);
    setGoals(goalsData);
    setTierState(tierData);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Computed stats
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();
  const weeklySpent = trips.filter((t) => t.date >= weekStart).reduce((s, t) => s + t.totalSpent, 0);
  const monthlySpent = trips.filter((t) => t.date >= monthStart).reduce((s, t) => s + t.totalSpent, 0);
  const totalSaved = trips.reduce((s, t) => s + (t.savedAmount ?? 0), 0);
  const avgTrip = trips.length > 0 ? trips.reduce((s, t) => s + t.totalSpent, 0) / trips.length : 0;

  const handleAddTrip = async () => {
    if (!tripStore.trim() || !tripAmount.trim()) return;
    const amount = parseFloat(tripAmount);
    if (isNaN(amount) || amount < 0) return;
    await addTripLog({
      date: Date.now(),
      storeName: tripStore.trim(),
      totalSpent: amount,
      savedAmount: 0,
      itemsBought: 0,
      notes: tripNote.trim() || undefined,
    });
    setTripStore(""); setTripAmount(""); setTripNote("");
    setShowAddTrip(false);
    await loadData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteTrip = (id: string, storeName: string) => {
    Alert.alert("Delete Trip", `Delete trip to "${storeName}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteTripLog(id);
        await loadData();
      }},
    ]);
  };

  const handleSaveBudget = async () => {
    const weekly = parseFloat(editWeekly) || 0;
    const monthly = parseFloat(editMonthly) || 0;
    await saveBudgetSettings({ weeklyBudget: weekly, monthlyBudget: monthly, currency: "USD" });
    setShowEditBudget(false);
    await loadData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddGoal = async () => {
    if (!goalName.trim() || !goalTarget.trim()) return;
    const target = parseFloat(goalTarget);
    const current = parseFloat(goalCurrent) || 0;
    if (isNaN(target) || target <= 0) return;
    await addSavingsGoal({ name: goalName.trim(), targetAmount: target, currentAmount: current, emoji: "🎯" });
    setGoalName(""); setGoalTarget(""); setGoalCurrent("");
    setShowAddGoal(false);
    await loadData();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleContributeGoal = (goal: SavingsGoal) => {
    Alert.prompt(
      "Add to Goal",
      `How much did you save toward "${goal.name}"?`,
      async (value) => {
        const amount = parseFloat(value ?? "");
        if (!isNaN(amount) && amount > 0) {
          await updateSavingsGoal(goal.id, { currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount) });
          await loadData();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      },
      "plain-text",
      "",
      "decimal-pad"
    );
  };

  const TABS: { key: BudgetTab; label: string; icon: string }[] = [
    { key: "trips", label: "Trip Log", icon: "🛒" },
    { key: "budget", label: "Budget", icon: "📊" },
    { key: "goals", label: "Goals", icon: "🎯" },
  ];

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <IconSymbol name="arrow.left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>💰 Budget & Savings</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Summary Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll} contentContainerStyle={styles.summaryContent}>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>This Week</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatCurrency(weeklySpent)}</Text>
            {budget.weeklyBudget > 0 && (
              <Text style={[styles.summarySubtext, { color: colors.muted }]}>of {formatCurrency(budget.weeklyBudget)}</Text>
            )}
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.success + "15", borderColor: colors.success + "30" }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>This Month</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(monthlySpent)}</Text>
            {budget.monthlyBudget > 0 && (
              <Text style={[styles.summarySubtext, { color: colors.muted }]}>of {formatCurrency(budget.monthlyBudget)}</Text>
            )}
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total Saved</Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>{formatCurrency(totalSaved)}</Text>
            <Text style={[styles.summarySubtext, { color: colors.muted }]}>via coupons & deals</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Avg Trip</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatCurrency(avgTrip)}</Text>
            <Text style={[styles.summarySubtext, { color: colors.muted }]}>{trips.length} trips total</Text>
          </View>
        </ScrollView>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabEmoji}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, { color: activeTab === tab.key ? colors.primary : colors.muted }]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Trip Log Tab */}
        {activeTab === "trips" && (
          <View style={{ flex: 1 }}>
            <Pressable
              style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowAddTrip(true)}
            >
              <IconSymbol name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Log a Trip</Text>
            </Pressable>
            {trips.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🛒</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No trips yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Log your shopping trips to track spending over time</Text>
              </View>
            ) : (
              <FlatList
                data={[...trips].sort((a, b) => b.date - a.date)}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <View style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.tripHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.tripStore, { color: colors.foreground }]}>🏪 {item.storeName}</Text>
                        <Text style={[styles.tripDate, { color: colors.muted }]}>{formatDate(item.date)}</Text>
                        {item.notes && <Text style={[styles.tripNote, { color: colors.muted }]}>{item.notes}</Text>}
                      </View>
                      <View style={styles.tripRight}>
                        <Text style={[styles.tripAmount, { color: colors.foreground }]}>{formatCurrency(item.totalSpent)}</Text>
                        {(item.savedAmount ?? 0) > 0 && (
                          <Text style={[styles.tripSaved, { color: colors.success }]}>-{formatCurrency(item.savedAmount ?? 0)} saved</Text>
                        )}
                      </View>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => handleDeleteTrip(item.id, item.storeName)}
                    >
                      <IconSymbol name="trash.fill" size={14} color={colors.error} />
                    </Pressable>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* Budget Tab */}
        {activeTab === "budget" && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80, gap: 16 }}>
            {/* Budget Overview */}
            <View style={[styles.budgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetLabel, { color: colors.foreground }]}>Weekly Budget</Text>
                <Text style={[styles.budgetValue, { color: budget.weeklyBudget > 0 ? colors.primary : colors.muted }]}>
                  {budget.weeklyBudget > 0 ? formatCurrency(budget.weeklyBudget) : "Not set"}
                </Text>
              </View>
              {budget.weeklyBudget > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, {
                      backgroundColor: weeklySpent > budget.weeklyBudget ? colors.error : colors.primary,
                      width: `${Math.min((weeklySpent / budget.weeklyBudget) * 100, 100)}%` as any,
                    }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.muted }]}>
                    {formatCurrency(weeklySpent)} spent · {formatCurrency(Math.max(budget.weeklyBudget - weeklySpent, 0))} remaining
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.budgetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.budgetRow}>
                <Text style={[styles.budgetLabel, { color: colors.foreground }]}>Monthly Budget</Text>
                <Text style={[styles.budgetValue, { color: budget.monthlyBudget > 0 ? colors.primary : colors.muted }]}>
                  {budget.monthlyBudget > 0 ? formatCurrency(budget.monthlyBudget) : "Not set"}
                </Text>
              </View>
              {budget.monthlyBudget > 0 && (
                <View style={{ marginTop: 8 }}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, {
                      backgroundColor: monthlySpent > budget.monthlyBudget ? colors.error : colors.success,
                      width: `${Math.min((monthlySpent / budget.monthlyBudget) * 100, 100)}%` as any,
                    }]} />
                  </View>
                  <Text style={[styles.progressText, { color: colors.muted }]}>
                    {formatCurrency(monthlySpent)} spent · {formatCurrency(Math.max(budget.monthlyBudget - monthlySpent, 0))} remaining
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => { setEditWeekly(budget.weeklyBudget > 0 ? String(budget.weeklyBudget) : ""); setEditMonthly(budget.monthlyBudget > 0 ? String(budget.monthlyBudget) : ""); setShowEditBudget(true); }}
            >
              <IconSymbol name="pencil" size={18} color="#fff" />
              <Text style={styles.addBtnText}>Set Budget</Text>
            </Pressable>

            {/* Spending by Store */}
            {trips.length > 0 && (
              <View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Spending by Store</Text>
                {Object.entries(
                  trips.reduce((acc, t) => {
                    acc[t.storeName] = (acc[t.storeName] ?? 0) + t.totalSpent;
                    return acc;
                  }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([store, amount]) => (
                  <View key={store} style={[styles.storeRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.storeName, { color: colors.foreground }]}>🏪 {store}</Text>
                    <Text style={[styles.storeAmount, { color: colors.primary }]}>{formatCurrency(amount)}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* Goals Tab */}
        {activeTab === "goals" && (
          <View style={{ flex: 1 }}>
            <Pressable
              style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowAddGoal(true)}
            >
              <IconSymbol name="plus" size={18} color="#fff" />
              <Text style={styles.addBtnText}>New Savings Goal</Text>
            </Pressable>
            {goals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎯</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No goals yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Set a savings goal and track your progress</Text>
              </View>
            ) : (
              <FlatList
                data={goals}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                renderItem={({ item }) => {
                  const pct = item.targetAmount > 0 ? Math.min(item.currentAmount / item.targetAmount, 1) : 0;
                  const done = pct >= 1;
                  return (
                    <Pressable
                      style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: done ? colors.success : colors.border }]}
                      onPress={() => !done && handleContributeGoal(item)}
                    >
                      <View style={styles.goalHeader}>
                        <Text style={[styles.goalName, { color: colors.foreground }]}>{done ? "✅" : "🎯"} {item.name}</Text>
                        <Text style={[styles.goalPct, { color: done ? colors.success : colors.primary }]}>{Math.round(pct * 100)}%</Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: colors.border, marginVertical: 8 }]}>
                        <View style={[styles.progressFill, {
                          backgroundColor: done ? colors.success : colors.primary,
                          width: `${pct * 100}%` as any,
                        }]} />
                      </View>
                      <Text style={[styles.goalAmounts, { color: colors.muted }]}>
                        {formatCurrency(item.currentAmount)} of {formatCurrency(item.targetAmount)}
                        {!done && " · Tap to add progress"}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>

      {/* Add Trip Modal */}
      <Modal visible={showAddTrip} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>🛒 Log a Trip</Text>
            <Pressable onPress={() => setShowAddTrip(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Store name (e.g. Walmart, Kroger)"
              placeholderTextColor={colors.muted}
              value={tripStore}
              onChangeText={setTripStore}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Amount spent (e.g. 47.83)"
              placeholderTextColor={colors.muted}
              value={tripAmount}
              onChangeText={setTripAmount}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Note (optional)"
              placeholderTextColor={colors.muted}
              value={tripNote}
              onChangeText={setTripNote}
              returnKeyType="done"
            />
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: tripStore.trim() && tripAmount.trim() ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleAddTrip}
              disabled={!tripStore.trim() || !tripAmount.trim()}
            >
              <Text style={styles.saveBtnText}>Save Trip</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Budget Modal */}
      <Modal visible={showEditBudget} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>📊 Set Budget</Text>
            <Pressable onPress={() => setShowEditBudget(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <Text style={[styles.inputLabel, { color: colors.muted }]}>Weekly Budget</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="e.g. 150"
              placeholderTextColor={colors.muted}
              value={editWeekly}
              onChangeText={setEditWeekly}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            <Text style={[styles.inputLabel, { color: colors.muted }]}>Monthly Budget</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="e.g. 600"
              placeholderTextColor={colors.muted}
              value={editMonthly}
              onChangeText={setEditMonthly}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSaveBudget}
            >
              <Text style={styles.saveBtnText}>Save Budget</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Goal Modal */}
      <Modal visible={showAddGoal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>🎯 New Savings Goal</Text>
            <Pressable onPress={() => setShowAddGoal(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Goal name (e.g. Save $500 on groceries)"
              placeholderTextColor={colors.muted}
              value={goalName}
              onChangeText={setGoalName}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Target amount (e.g. 500)"
              placeholderTextColor={colors.muted}
              value={goalTarget}
              onChangeText={setGoalTarget}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Current progress (optional)"
              placeholderTextColor={colors.muted}
              value={goalCurrent}
              onChangeText={setGoalCurrent}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: goalName.trim() && goalTarget.trim() ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleAddGoal}
              disabled={!goalName.trim() || !goalTarget.trim()}
            >
              <Text style={styles.saveBtnText}>Create Goal</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  summaryScroll: { marginBottom: 12 },
  summaryContent: { gap: 10, paddingVertical: 4 },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 14, minWidth: 120 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: "700" },
  summarySubtext: { fontSize: 11, marginTop: 2 },
  tabBar: { flexDirection: "row", borderRadius: 12, borderWidth: 1, marginBottom: 14, overflow: "hidden" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10 },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  tripCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  tripHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tripStore: { fontSize: 15, fontWeight: "600" },
  tripDate: { fontSize: 12, marginTop: 2 },
  tripNote: { fontSize: 12, marginTop: 4, fontStyle: "italic" },
  tripRight: { alignItems: "flex-end" },
  tripAmount: { fontSize: 18, fontWeight: "700" },
  tripSaved: { fontSize: 12, marginTop: 2 },
  deleteBtn: { alignSelf: "flex-end", marginTop: 8, padding: 4 },
  budgetCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  budgetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  budgetLabel: { fontSize: 16, fontWeight: "600" },
  budgetValue: { fontSize: 18, fontWeight: "700" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  storeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5 },
  storeName: { fontSize: 14 },
  storeAmount: { fontSize: 14, fontWeight: "600" },
  goalCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  goalName: { fontSize: 15, fontWeight: "600", flex: 1 },
  goalPct: { fontSize: 16, fontWeight: "700" },
  goalAmounts: { fontSize: 12 },
  modal: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  inputLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: -8 },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
