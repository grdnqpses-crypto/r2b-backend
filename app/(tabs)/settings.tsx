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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useCustomBeliefs } from "@/hooks/use-custom-beliefs";
import { useScanHistoryContext } from "@/lib/scan-history-provider";
import { useBeliefStreak } from "@/hooks/use-belief-streak";
import { useFamilyProfiles } from "@/hooks/use-family-profiles";
import { usePremium } from "@/hooks/use-premium";
import { useNotifications } from "@/hooks/use-notifications";
import { useAchievements } from "@/hooks/use-achievements";
import { useDeveloperMode } from "@/hooks/use-developer-mode";
import { FamilyProfilesScreen } from "@/components/family-profiles";
import { PremiumPaywall } from "@/components/premium-paywall";
import { AchievementsGallery } from "@/components/achievements-gallery";
import { DeveloperPanel } from "@/components/developer-panel";
import { ShareReferral } from "@/components/share-referral";
import { getAvailableStoryBeliefIds } from "@/constants/belief-stories";
import { Haptics, LinearGradient } from "@/lib/safe-imports";

// Settings keys
const SETTINGS_KEY = "belief-field-settings";

export interface AppSettings {
  scanDuration: 30 | 60 | 90;
  soundEnabled: boolean;
  meditationEnabled: boolean;
  hapticEnabled: boolean;
  storyNarrationEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  scanDuration: 60,
  soundEnabled: true,
  meditationEnabled: true,
  hapticEnabled: true,
  storyNarrationEnabled: true,
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

type SubScreen = "main" | "profiles" | "paywall" | "achievements" | "developer" | "share";

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, updateSettings, loaded } = useAppSettings();
  const { customBeliefs, removeBelief } = useCustomBeliefs();
  const { history, clearHistory } = useScanHistoryContext();
  const { streak } = useBeliefStreak();
  const familyProfiles = useFamilyProfiles();
  const premium = usePremium();
  const notifications = useNotifications();
  const achievements = useAchievements();
  const devMode = useDeveloperMode();
  const [subScreen, setSubScreen] = useState<SubScreen>("main");
  const storyBeliefCount = getAvailableStoryBeliefIds().length;

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
      clearHistory();
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
            clearHistory();
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

  const reminderTimeOptions = [
    { hour: 8, minute: 0, label: "8:00 AM", desc: "Start your day with belief" },
    { hour: 12, minute: 0, label: "12:00 PM", desc: "Midday belief check" },
    { hour: 17, minute: 0, label: "5:00 PM", desc: "After school/work" },
    { hour: 19, minute: 0, label: "7:00 PM", desc: "Evening belief time" },
    { hour: 20, minute: 30, label: "8:30 PM", desc: "Before bedtime (recommended)" },
  ];

  if (!loaded) return null;

  // Sub-screens
  if (subScreen === "profiles") {
    return (
      <ScreenContainer>
        <FamilyProfilesScreen
          profiles={familyProfiles.profiles}
          activeProfile={familyProfiles.activeProfile}
          onAddProfile={(name, emoji) => familyProfiles.addProfile(name, emoji)}
          onSwitchProfile={familyProfiles.switchProfile}
          onRemoveProfile={familyProfiles.removeProfile}
          onDismiss={() => setSubScreen("main")}
          maxProfiles={premium.premium.isPremium ? 10 : 2}
        />
      </ScreenContainer>
    );
  }

  if (subScreen === "paywall") {
    return (
      <ScreenContainer>
        <PremiumPaywall
          reason="general"
          onActivate={(family) => { premium.activatePremium(family); setSubScreen("main"); }}
          onDismiss={() => setSubScreen("main")}
        />
      </ScreenContainer>
    );
  }

  if (subScreen === "achievements") {
    return (
      <ScreenContainer>
        <AchievementsGallery
          earned={achievements.earned}
          isEarned={achievements.isEarned}
          getEarnedDate={achievements.getEarnedDate}
          totalEarned={achievements.totalEarned}
          totalAvailable={achievements.totalAvailable}
          onDismiss={() => setSubScreen("main")}
        />
      </ScreenContainer>
    );
  }

  if (subScreen === "share") {
    return (
      <ScreenContainer>
        <ShareReferral
          onDismiss={() => setSubScreen("main")}
          onFreeWeekEarned={() => setSubScreen("main")}
        />
      </ScreenContainer>
    );
  }

  if (subScreen === "developer") {
    return (
      <ScreenContainer>
        <DeveloperPanel
          devMode={devMode.devMode}
          onUpdate={devMode.updateDevSetting}
          onDisable={() => { devMode.disableDevMode(); setSubScreen("main"); }}
          onDismiss={() => setSubScreen("main")}
        />
      </ScreenContainer>
    );
  }

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

        {/* SHARE & EARN */}
        <Pressable
          onPress={() => setSubScreen("share")}
          style={({ pressed }) => [{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 16,
            borderRadius: 18,
            borderWidth: 1,
            marginBottom: 12,
            backgroundColor: colors.surface,
            borderColor: "rgba(155,122,255,0.4)",
            opacity: pressed ? 0.8 : 1,
          }]}
        >
          <Text style={{ fontSize: 32 }}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={[{ fontSize: 16, fontWeight: "800", color: colors.foreground }]}>
              Share & Earn Free Week
            </Text>
            <Text style={[{ fontSize: 12, color: colors.muted, marginTop: 2 }]}>
              Invite friends — you both get 1 week free
            </Text>
          </View>
          <Text style={[{ fontSize: 18, color: colors.primary }]}>→</Text>
        </Pressable>

        {/* ACHIEVEMENTS */}
        <Pressable
          onPress={() => setSubScreen("achievements")}
          style={({ pressed }) => [styles.achievementBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <LinearGradient
            colors={["#FFD700", "#FF8C00"]}
            style={styles.achievementGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.achievementContent}>
              <Text style={styles.achievementEmoji}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementTitle}>Achievements</Text>
                <Text style={styles.achievementSub}>
                  {achievements.totalEarned} / {achievements.totalAvailable} badges earned
                </Text>
              </View>
              <Text style={styles.achievementArrow}>→</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* NOTIFICATIONS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🔔 Daily Reminders</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Get a gentle daily reminder to measure your belief field. Helps maintain your streak and deepen your practice.
          </Text>

          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Daily Reminder</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                {notifications.settings.enabled
                  ? "You'll receive a daily reminder to scan"
                  : "Enable to get daily belief reminders"}
              </Text>
            </View>
            <Switch
              value={notifications.settings.enabled}
              onValueChange={async (v) => {
                if (v) {
                  const granted = await notifications.enableReminders();
                  if (!granted && Platform.OS !== "web") {
                    Alert.alert(
                      "Permission Required",
                      "Please enable notifications in your device settings to receive daily reminders."
                    );
                  }
                } else {
                  notifications.disableReminders();
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={notifications.settings.enabled ? colors.primary : colors.muted}
            />
          </View>

          {notifications.settings.enabled && (
            <View style={styles.timeOptions}>
              <Text style={[styles.timeLabel, { color: colors.foreground }]}>Reminder Time</Text>
              {reminderTimeOptions.map((opt) => {
                const selected =
                  notifications.settings.reminderHour === opt.hour &&
                  notifications.settings.reminderMinute === opt.minute;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      notifications.setReminderTime(opt.hour, opt.minute);
                    }}
                    style={({ pressed }) => [
                      styles.timeOption,
                      {
                        backgroundColor: selected ? colors.primary + "15" : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.timeOptionLabel, { color: selected ? colors.primary : colors.foreground }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.timeOptionDesc, { color: colors.muted }]}>{opt.desc}</Text>
                    {selected && <Text style={[styles.timeCheck, { color: colors.primary }]}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}
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

        {/* STORY NARRATION */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>📖 Belief Stories</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Immersive narrated stories that play during scans, guiding your imagination and deepening your belief experience. Available for {storyBeliefCount} beliefs.
          </Text>

          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Story Narration</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted }]}>
                Voice-narrated belief journeys during scans
              </Text>
            </View>
            <Switch
              value={settings.storyNarrationEnabled}
              onValueChange={(v) => updateSettings({ storyNarrationEnabled: v })}
              trackColor={{ false: colors.border, true: colors.primary + "60" }}
              thumbColor={settings.storyNarrationEnabled ? colors.primary : colors.muted}
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

        {/* FAMILY PROFILES */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>👨‍👩‍👧‍👦 Family Profiles</Text>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Each family member gets their own scan history, journal, and streak. Switch profiles to keep everyone's belief journey separate.
          </Text>

          {familyProfiles.activeProfile && (
            <View style={[styles.activeProfileCard, { backgroundColor: colors.surface, borderColor: colors.primary + "40" }]}>
              <Text style={{ fontSize: 28 }}>{familyProfiles.activeProfile.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleTitle, { color: colors.foreground }]}>{familyProfiles.activeProfile.name}</Text>
                <Text style={[styles.toggleDesc, { color: colors.primary }]}>Active Profile</Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={() => setSubScreen("profiles")}
            style={({ pressed }) => [
              styles.profileBtn,
              { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.profileBtnText, { color: colors.primary }]}>
              Manage Profiles ({familyProfiles.profiles.length}/{premium.premium.isPremium ? 10 : 2})
            </Text>
          </Pressable>
        </View>

        {/* PREMIUM */}
        {!premium.premium.isPremium && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>👑 Premium</Text>
            <Text style={[styles.sectionDesc, { color: colors.muted }]}>
              Unlock unlimited scans, all belief categories, up to 10 family profiles, and more.
            </Text>
            <Pressable
              onPress={() => setSubScreen("paywall")}
              style={({ pressed }) => [
                styles.premiumBtn,
                { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <LinearGradient
                colors={["#9B7AFF", "#6B4FCC"]}
                style={styles.premiumBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.premiumBtnText}>Upgrade to Premium</Text>
                <Text style={styles.premiumBtnSub}>Unlock the full experience</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {premium.premium.isPremium && (
          <View style={[styles.premiumActive, { backgroundColor: colors.surface, borderColor: colors.primary + "40" }]}>
            <Text style={{ fontSize: 24 }}>👑</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: colors.primary }]}>Premium Active</Text>
              <Text style={[styles.toggleDesc, { color: colors.muted }]}>All features unlocked</Text>
            </View>
          </View>
        )}

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
              <Text style={[styles.statLabel, { color: colors.muted }]}>Journal</Text>
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

        {/* VERSION — Tap 11 times for developer mode */}
        <Pressable
          onPress={devMode.registerTap}
          style={styles.versionArea}
        >
          <Text style={[styles.versionText, { color: colors.muted }]}>
            Belief Field Detector v1.0.0
          </Text>
          <Text style={[styles.versionSub, { color: colors.border }]}>
            Made with science and wonder
          </Text>
        </Pressable>

        {/* Developer Mode Entry (only visible when activated) */}
        {devMode.devMode.enabled && (
          <Pressable
            onPress={() => setSubScreen("developer")}
            style={({ pressed }) => [
              styles.devModeBtn,
              { backgroundColor: "#FF980015", borderColor: "#FF9800", opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.devModeBtnText}>🛠️ Developer Mode</Text>
            <Text style={[styles.devModeBtnSub, { color: colors.muted }]}>
              Debug tools and build configuration
            </Text>
          </Pressable>
        )}

        {/* Dev mode toast */}
        {devMode.showToast !== "" && (
          <View style={[styles.toast, { backgroundColor: colors.foreground }]}>
            <Text style={[styles.toastText, { color: colors.background }]}>{devMode.showToast}</Text>
          </View>
        )}

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
  activeProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  profileBtn: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  profileBtnText: { fontSize: 15, fontWeight: "700" },
  premiumBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  premiumBtnGradient: {
    padding: 18,
    alignItems: "center",
    borderRadius: 16,
  },
  premiumBtnText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  premiumBtnSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  premiumActive: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 28,
    gap: 12,
  },
  achievementBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 28,
  },
  achievementGradient: {
    borderRadius: 16,
    padding: 18,
  },
  achievementContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  achievementEmoji: { fontSize: 32 },
  achievementTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  achievementSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  achievementArrow: { fontSize: 20, fontWeight: "800", color: "#fff" },
  timeOptions: { marginTop: 8, gap: 6 },
  timeLabel: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  timeOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  timeOptionLabel: { fontSize: 15, fontWeight: "700", width: 80 },
  timeOptionDesc: { fontSize: 12, flex: 1 },
  timeCheck: { fontSize: 16, fontWeight: "800" },
  versionArea: {
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 12,
  },
  versionText: { fontSize: 13, fontWeight: "500" },
  versionSub: { fontSize: 11, marginTop: 4 },
  devModeBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  devModeBtnText: { fontSize: 15, fontWeight: "700", color: "#FF9800" },
  devModeBtnSub: { fontSize: 12, marginTop: 4 },
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: { fontSize: 14, fontWeight: "600" },
});
