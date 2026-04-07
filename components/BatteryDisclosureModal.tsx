/**
 * BatteryDisclosureModal — Android Battery Optimization Disclosure (Phase 2)
 *
 * Shown before launching the android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
 * intent. Explains why the app needs to be exempt from battery optimization
 * so that geofences fire reliably when the phone is in the user's pocket.
 *
 * Exact disclosure text per Master Directive:
 * "To ensure geofences trigger while your phone is in your pocket,
 *  Remember2Buy needs to be exempt from Android Battery Optimizations.
 *  Please allow this on the next screen."
 */
import { Modal, View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export interface BatteryDisclosureModalProps {
  visible: boolean;
  onNotNow: () => void;
  onGotIt: () => void;
}

export function BatteryDisclosureModal({
  visible,
  onNotNow,
  onGotIt,
}: BatteryDisclosureModalProps) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onNotNow}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.warning + "20" }]}>
            <Text style={styles.iconText}>🔋</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            Battery Optimization
          </Text>

          {/* Mandatory disclosure text — exact wording per directive */}
          <Text style={[styles.body, { color: colors.foreground }]}>
            To ensure geofences trigger while your phone is in your pocket,{" "}
            <Text style={styles.bold}>
              Remember2Buy needs to be exempt from Android Battery Optimizations.
            </Text>
            {" "}Please allow this on the next screen.
          </Text>

          {/* What this means */}
          <View style={[styles.usageBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.usageItem, { color: colors.muted }]}>
              ✅ Allows the app to wake up when you enter a store zone
            </Text>
            <Text style={[styles.usageItem, { color: colors.muted }]}>
              ✅ Does NOT drain your battery — geofencing is low-power
            </Text>
            <Text style={[styles.usageItem, { color: colors.muted }]}>
              ✅ Without this, Android may kill alerts in your pocket
            </Text>
            <Text style={[styles.usageItem, { color: colors.muted }]}>
              ✅ You can revoke this at any time in Android Settings
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.btnSecondary,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={onNotNow}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.muted }]}>
                Not Now
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                { backgroundColor: colors.warning, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={onGotIt}
            >
              <Text style={styles.btnPrimaryText}>Got It →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconText: { fontSize: 30 },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 26,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  bold: { fontWeight: "700" },
  usageBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
    gap: 6,
  },
  usageItem: { fontSize: 13, lineHeight: 19 },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
    width: "100%",
  },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnSecondaryText: { fontSize: 15, fontWeight: "600" },
  btnPrimary: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
