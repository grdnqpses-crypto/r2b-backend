import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCustomBeliefs } from "@/hooks/use-custom-beliefs";
import { useScanHistory } from "@/hooks/use-scan-history";
import { useBeliefStreak } from "@/hooks/use-belief-streak";

// Settings keys
const SETTINGS_KEY = "belief-field-settings";

export interface AppSettings {
  scanDuration: 30 | 60 | 90;
  soundEnabled: boolean;
  meditationEnabled: boolean;
  hapticEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  scanDuration: 60,
  soundEnabled: true,
  meditationEnabled: true,
  hapticEnabled: true,
};

// Export a hook so other screens can read settings
export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { settings, updateSettings, loaded };
}

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, updateSettings, loaded } = useAppSettings();
  const { customBeliefs, removeBelief } = useCustomBeliefs();
  const { history } = useScanHistory();
  const { streak } = useBeliefStreak();

  const handleDeleteCustomBelief = useCallback(
    (id: string, name: string) => {
      if (Platform.OS === "web") {
        removeBelief(id);
        return;
      }
      Alert.alert(
        "Delete Custom Belief",
        `Are you sure you want to remove "${name}" from your custom beliefs?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => removeBelief(id),
          },
        ]
      );
    },
    [removeBelief]
  );

  const handleClearHistory = useCallback(() => {
    if (Platform.OS === "web") {
      AsyncStorage.removeItem("belief-scan-history");
      return;
    }
    Alert.alert(
      "Clear Scan History",
      "This will permanently delete all your scan history and journal entries. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            AsyncStorage.removeItem("belief-scan-history");
          },
        },
      ]
    );
  }, []);

  const durationOptions: { value: 30 | 60 | 90; label: string; desc: string }[] = [
    { value: 30, label: "30s", desc: "Quick scan — great for kids or when you're short on time" },
    { value: 60, label: "60s", desc: "Standard scan — recommended for the best results" },
    { value: 90, label: "90s", desc: "Deep scan — maximum sensor data collection for detailed analysis" },
  ];

  if (!loaded) return null;

  return (
    <ScreenContainer>
      <LinearGradient
        colors={["rgba(155,122,255,0.06)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            Customize how the Belief Field Detector works for you
          </Text>
        </View>

        {/* SCAN DURATION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>⏱️ Scan Duration</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            How long each belief scan lasts. Longer scans collect more sensor data for more detailed results.
          </Text>
          <View style={styles.durationOptions}>
            {durationOptions.map((opt) => {
              const selected = settings.scanDuration === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateSettings({ scanDuration: opt.value });
                  }}
                  style={({ pressed }) => [
                    styles.durationCard,
                    {
                      backgroundColor: selected ? colors.primary + "15" : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.durationLabel, { color: selected ? colors.primary : colors.foreground }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.durationDesc, { color: colors.muted }]}>{opt.desc}</Text>
                  {selected && (
                    <Text style={[styles.durationCheck, { color: colors.primary }]}>✓ Selected</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* SOUND */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🔊 Sound & Audio</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Control the ambient sound effects during scans and voice guidance during meditation.
          </Text>

          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Scan Sound Effects</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                Ambient audio that intensifies with your belief score
              </Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(v) => updateSettings({ soundEnabled: v })}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={settings.soundEnabled ? colors.primary : colors.muted}
            />
          </View>

          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Haptic Feedback</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                Vibration feedback during scans and interactions
              </Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(v) => updateSettings({ hapticEnabled: v })}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={settings.hapticEnabled ? colors.primary : colors.muted}
            />
          </View>
        </View>

        {/* MEDITATION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🧘 Pre-Scan Meditation</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            A guided breathing exercise before each scan. Helps you focus your mind for better results.
          </Text>

          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Guided Meditation</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                Voice-guided breathing and visualization before scans
              </Text>
            </View>
            <Switch
              value={settings.meditationEnabled}
              onValueChange={(v) => updateSettings({ meditationEnabled: v })}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={settings.meditationEnabled ? colors.primary : colors.muted}
            />
          </View>
        </View>

        {/* CUSTOM BELIEFS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🎨 My Custom Beliefs</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Manage the custom beliefs you've created. You can delete ones you no longer need.
          </Text>

          {customBeliefs.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No custom beliefs yet. Create one from the Detect tab!
              </Text>
            </View>
          ) : (
            customBeliefs.map((belief) => (
              <View
                key={belief.id}
                style={[styles.beliefCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={styles.beliefCardEmoji}>{belief.emoji}</Text>
                <View style={styles.beliefCardInfo}>
                  <Text style={[styles.beliefCardName, { color: colors.foreground }]}>{belief.name}</Text>
                  <Text style={[styles.beliefCardDesc, { color: colors.muted }]} numberOfLines={1}>
                    {belief.description}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteCustomBelief(belief.id, belief.name)}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    { backgroundColor: colors.error + "15", opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[styles.deleteBtnText, { color: colors.error }]}>✕</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {/* STATS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📊 Your Stats</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            A summary of your belief journey so far.
          </Text>

          <View style={[styles.statsGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{history.length}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Total Scans</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{streak.currentStreak}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Day Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{streak.personalBest}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Best Score</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {history.filter((h) => h.journalEntry).length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Journal Entries</Text>
            </View>
          </View>
        </View>

        {/* DATA MANAGEMENT */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🗂️ Data Management</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Your data is stored locally on your device. Nothing is sent to any server.
          </Text>

          <Pressable
            onPress={handleClearHistory}
            style={({ pressed }) => [
              styles.dangerBtn,
              { backgroundColor: colors.error + "10", borderColor: colors.error + "40", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.dangerBtnText, { color: colors.error }]}>Clear All Scan History</Text>
            <Text style={[styles.dangerBtnSub, { color: colors.muted }]}>
              This permanently deletes all scans and journal entries
            </Text>
          </Pressable>
        </View>

        {/* HOW IT WORKS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ℹ️ How It Works</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              The Belief Field Detector uses your phone's built-in scientific sensors — accelerometer, gyroscope, magnetometer, barometer, light sensor, motion detector, and pedometer — to measure changes in your physical environment while you focus on a belief.
            </Text>
            <Text style={[styles.infoText, { color: colors.muted, marginTop: 8 }]}>
              When you believe in something with deep focus and intention, your body produces subtle physical changes: micro-movements, electromagnetic variations, temperature shifts, and changes in breathing patterns. These are real, measurable phenomena documented in scientific research.
            </Text>
            <Text style={[styles.infoText, { color: colors.muted, marginTop: 8 }]}>
              Your Belief Field Score (0-100) represents how much your focused belief changed the sensor readings compared to your baseline environment. Higher scores indicate stronger, more measurable belief fields.
            </Text>
          </View>
        </View>

        {/* Privacy */}
        <View style={[styles.privacyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.privacyTitle, { color: colors.foreground }]}>🔒 Privacy</Text>
          <Text style={[styles.privacyText, { color: colors.muted }]}>
            All data stays on your device. No sensor data, scan results, or journal entries are ever sent to any server. Your beliefs are yours alone.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  header: { alignItems: "center", paddingTop: 12, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "900" },
  headerSub: { fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 4 },
  sectionDesc: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  durationOptions: { gap: 8 },
  durationCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
  },
  durationLabel: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  durationDesc: { fontSize: 13, lineHeight: 18 },
  durationCheck: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleTitle: { fontSize: 15, fontWeight: "600" },
  toggleDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, textAlign: "center" },
  beliefCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  beliefCardEmoji: { fontSize: 28 },
  beliefCardInfo: { flex: 1 },
  beliefCardName: { fontSize: 15, fontWeight: "600" },
  beliefCardDesc: { fontSize: 12, marginTop: 2 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: { fontSize: 14, fontWeight: "700" },
  statsGrid: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 24, fontWeight: "900" },
  statLabel: { fontSize: 10, fontWeight: "600", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, height: 40 },
  dangerBtn: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  dangerBtnText: { fontSize: 15, fontWeight: "700" },
  dangerBtnSub: { fontSize: 12, marginTop: 4 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  infoText: { fontSize: 13, lineHeight: 20 },
  privacyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  privacyTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  privacyText: { fontSize: 13, lineHeight: 20 },
});
