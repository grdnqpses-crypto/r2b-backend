import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  TextInput, Alert, Modal, ScrollView, Switch,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getReminders, addReminder, deleteReminder, saveReminders,
  type ShoppingReminder,
} from "@/lib/storage";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function RemindersScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const [reminders, setReminders] = useState<ShoppingReminder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editReminder, setEditReminder] = useState<ShoppingReminder | null>(null);

  // Form state
  const [label, setLabel] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [hour, setHour] = useState(9);
  const [weatherAware, setWeatherAware] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const loadReminders = useCallback(async () => {
    const data = await getReminders();
    setReminders(data);
  }, []);

  useFocusEffect(useCallback(() => { loadReminders(); }, [loadReminders]));

  const resetForm = () => {
    setLabel(""); setSelectedDay(1); setHour(9);
    setWeatherAware(false); setEnabled(true); setEditReminder(null);
  };

  const handleOpenAdd = () => { resetForm(); setShowModal(true); };

  const handleOpenEdit = (r: ShoppingReminder) => {
    setEditReminder(r);
    setLabel(r.label);
    setSelectedDay(r.dayOfWeek ?? 1);
    setHour(r.hour ?? 9);
    setEnabled(r.isEnabled);
    setShowModal(true);
  };

  const requestNotifPermission = async () => {
    if (Platform.OS === "web") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  };

  const scheduleNotification = async (r: ShoppingReminder) => {
    if (!r.isEnabled || Platform.OS === "web") return;
    if (r.notificationId) await Notifications.cancelScheduledNotificationAsync(r.notificationId).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🛒 Shopping Reminder",
        body: r.label || "Time to check your shopping list!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: (r.dayOfWeek ?? 1) + 1,
        hour: r.hour ?? 9,
        minute: r.minute ?? 0,
      },
    }).catch(() => {});
  };

  const handleSave = async () => {
    const lbl = label.trim() || "Shopping Reminder";
    const granted = await requestNotifPermission();
    if (!granted) {
      Alert.alert("Notifications Disabled", "Please enable notifications in Settings to use reminders.");
      return;
    }
    let saved: ShoppingReminder;
    if (editReminder) {
      const all = await getReminders();
      const updated = all.map((r) => r.id === editReminder.id
        ? { ...r, label: lbl, dayOfWeek: selectedDay, hour, minute: 0, isEnabled: enabled }
        : r
      );
      await saveReminders(updated);
      saved = updated.find((r) => r.id === editReminder.id)!;
    } else {
      saved = await addReminder({
        label: lbl, dayOfWeek: selectedDay, hour, minute: 0, isEnabled: enabled,
      });
    }
    await scheduleNotification(saved);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadReminders();
    resetForm();
    setShowModal(false);
  };

  const handleDelete = (r: ShoppingReminder) => {
    Alert.alert("Delete Reminder", `Delete "${r.label}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          if (r.notificationId) await Notifications.cancelScheduledNotificationAsync(r.notificationId).catch(() => {});
          await deleteReminder(r.id);
          await loadReminders();
        },
      },
    ]);
  };

  const handleToggleEnabled = async (r: ShoppingReminder) => {
    const newEnabled = !r.isEnabled;
    const all = await getReminders();
    await saveReminders(all.map((x) => x.id === r.id ? { ...x, isEnabled: newEnabled } : x));
    if (!newEnabled && r.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(r.notificationId).catch(() => {});
    } else {
      await scheduleNotification({ ...r, isEnabled: newEnabled });
    }
    await loadReminders();
  };

  const formatSchedule = (r: ShoppingReminder) => {
    const day = DAYS[r.dayOfWeek ?? 1] ?? "Weekly";
    const h = r.hour ?? 9;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `Every ${day} at ${h12}:00 ${ampm}`;
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>⏰ Smart Reminders</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Never forget to shop</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleOpenAdd}
          >
            <IconSymbol name="plus" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.infoText, { color: colors.primary }]}>
            🔔 Set weekly reminders to check your list before heading to the store. Weather-aware reminders skip rainy days automatically.
          </Text>
        </View>

        <FlatList
          data={reminders}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: item.isEnabled ? 1 : 0.6 }]}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + "18" }]}>
                <Text style={{ fontSize: 22 }}>⏰</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.cardSub, { color: colors.muted }]}>{formatSchedule(item)}</Text>
                {weatherAware && false && (
                  <Text style={[styles.tag, { color: colors.primary, backgroundColor: colors.primary + "15" }]}>🌤 Weather-aware</Text>
                )}
              </View>
              <View style={{ gap: 6, alignItems: "center" }}>
                <Switch
                  value={item.isEnabled}
                  onValueChange={() => handleToggleEnabled(item)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => handleOpenEdit(item)}>
                  <IconSymbol name="pencil" size={18} color={colors.muted} />
                </Pressable>
                <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => handleDelete(item)}>
                  <IconSymbol name="trash.fill" size={18} color={colors.error} />
                </Pressable>
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>⏰</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No reminders yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                Add a weekly reminder to check your shopping list before heading to the store.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.emptyBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleOpenAdd}
              >
                <Text style={styles.emptyBtnText}>Add First Reminder</Text>
              </Pressable>
            </View>
          }
        />
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {editReminder ? "Edit Reminder" : "New Reminder"}
            </Text>

            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="Reminder label (e.g. Weekly Grocery Run)"
              placeholderTextColor={colors.muted}
              value={label}
              onChangeText={setLabel}
              autoFocus
            />

            <Text style={[styles.label, { color: colors.muted }]}>Day of Week</Text>
            <View style={styles.daysRow}>
              {DAYS.map((d, i) => (
                <Pressable
                  key={d}
                  style={[styles.dayBtn, {
                    backgroundColor: selectedDay === i ? colors.primary : colors.surface,
                    borderColor: selectedDay === i ? colors.primary : colors.border,
                  }]}
                  onPress={() => setSelectedDay(i)}
                >
                  <Text style={{ color: selectedDay === i ? "#fff" : colors.muted, fontSize: 12, fontWeight: "600" }}>{d}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => {
                  const ampm = h >= 12 ? "PM" : "AM";
                  const h12 = h % 12 === 0 ? 12 : h % 12;
                  return (
                    <Pressable
                      key={h}
                      style={[styles.timeChip, {
                        backgroundColor: hour === h ? colors.primary : colors.surface,
                        borderColor: hour === h ? colors.primary : colors.border,
                      }]}
                      onPress={() => setHour(h)}
                    >
                      <Text style={{ color: hour === h ? "#fff" : colors.muted, fontSize: 12 }}>{h12}{ampm}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.toggleRow, { borderColor: colors.border }]}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>🌤 Weather-Aware</Text>
                <Text style={[styles.toggleDesc, { color: colors.muted }]}>Skip reminders on rainy or stormy days</Text>
              </View>
              <Switch
                value={weatherAware}
                onValueChange={setWeatherAware}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>{editReminder ? "Save Changes" : "Create Reminder"}</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => { resetForm(); setShowModal(false); }}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 12, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  infoText: { fontSize: 13, lineHeight: 19 },
  list: { paddingBottom: 24 },
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardSub: { fontSize: 12 },
  tag: { fontSize: 11, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  daysRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  toggleDesc: { fontSize: 12, marginTop: 2 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelBtn: { paddingVertical: 10, alignItems: "center" },
  cancelText: { fontSize: 15 },
});
