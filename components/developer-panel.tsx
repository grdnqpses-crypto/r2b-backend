import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { DevModeData } from "@/hooks/use-developer-mode";
import { Haptics } from "@/lib/safe-imports";

interface Props {
  devMode: DevModeData;
  onUpdate: (partial: Partial<DevModeData>) => void;
  onDisable: () => void;
  onDismiss: () => void;
}

export function DeveloperPanel({ devMode, onUpdate, onDisable, onDismiss }: Props) {
  const colors = useColors();

  const toggles: { key: keyof DevModeData; label: string; desc: string }[] = [
    {
      key: "showRawSensorData",
      label: "Raw Sensor Data Overlay",
      desc: "Show raw numeric sensor values on the scan screen",
    },
    {
      key: "showAlgorithmDetails",
      label: "Algorithm Details",
      desc: "Display the belief scoring algorithm's internal calculations",
    },
    {
      key: "showPerformanceMetrics",
      label: "Performance Metrics",
      desc: "Show FPS, memory usage, and sensor update frequency",
    },
    {
      key: "bypassPremium",
      label: "Bypass Premium Gate",
      desc: "Unlock all premium features for testing (dev only)",
    },
    {
      key: "forceHighScore",
      label: "Force High Score",
      desc: "Always produce scores above 85 for testing results screen",
    },
    {
      key: "debugLogging",
      label: "Debug Logging",
      desc: "Log sensor data and algorithm steps to console",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>🛠️ Developer Mode</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Warning Banner */}
        <View style={[styles.warningBanner, { backgroundColor: "#FF980020", borderColor: "#FF9800" }]}>
          <Text style={styles.warningEmoji}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.warningTitle, { color: "#FF9800" }]}>Developer Mode Active</Text>
            <Text style={[styles.warningDesc, { color: colors.muted }]}>
              These settings are for development and testing only. They may affect app behavior.
            </Text>
          </View>
        </View>

        {/* Build Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Build Information</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>App Version</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Platform</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{Platform.OS}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>OS Version</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {Platform.OS === "web" ? "Web" : Platform.Version}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Bundle ID</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>
              space.manus.belief.field.detector
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.muted }]}>Sensors</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              Accel, Gyro, Mag, Baro, Light, Motion, Pedo
            </Text>
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Debug Options</Text>
          {toggles.map((toggle) => (
            <View
              key={toggle.key}
              style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleTitle, { color: colors.foreground }]}>{toggle.label}</Text>
                <Text style={[styles.toggleDesc, { color: colors.muted }]}>{toggle.desc}</Text>
              </View>
              <Switch
                value={devMode[toggle.key] as boolean}
                onValueChange={(v) => onUpdate({ [toggle.key]: v })}
                trackColor={{ false: colors.border, true: "#FF980060" }}
                thumbColor={devMode[toggle.key] ? "#FF9800" : colors.muted}
              />
            </View>
          ))}
        </View>

        {/* Google Play Billing Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Billing Configuration</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Google Play Billing</Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>Configured</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Product ID (Monthly)</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>belief_premium_monthly</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Product ID (Annual)</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>belief_premium_annual</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Product ID (Family)</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>belief_premium_family</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Apple IAP</Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>Configured</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Signing Key</Text>
              <Text style={[styles.infoValue, { color: colors.success }]}>Google Play Managed</Text>
            </View>
          </View>
        </View>

        {/* Disable Button */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDisable();
          }}
          style={({ pressed }) => [
            styles.disableBtn,
            { backgroundColor: "#FF525220", borderColor: "#FF5252", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.disableBtnText}>Disable Developer Mode</Text>
          <Text style={[styles.disableBtnSub, { color: colors.muted }]}>
            All debug options will be turned off
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { width: 70 },
  backText: { fontSize: 16, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  warningBanner: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  warningEmoji: { fontSize: 24 },
  warningTitle: { fontSize: 15, fontWeight: "700" },
  warningDesc: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: "600", textAlign: "right", flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 12 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleTitle: { fontSize: 14, fontWeight: "600" },
  toggleDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  disableBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
  },
  disableBtnText: { fontSize: 15, fontWeight: "700", color: "#FF5252" },
  disableBtnSub: { fontSize: 12, marginTop: 4 },
});
