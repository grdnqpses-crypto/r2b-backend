/**
 * LocationDisclosureModal — Google Play Prominent Disclosure for Background Location
 *
 * Google Play policy (Android 11+) prohibits requesting background location
 * directly without first showing a "Prominent Disclosure" that clearly explains:
 *   1. Why the app needs background location
 *   2. How it will be used
 *   3. That the user must select "Allow all the time" on the next screen
 *
 * This modal satisfies that requirement before
 * Location.requestBackgroundPermissionsAsync() is called.
 */
import { Modal, View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface LocationDisclosureModalProps {
  visible: boolean;
  onNotNow: () => void;
  onGotIt: () => void;
}

export function LocationDisclosureModal({
  visible,
  onNotNow,
  onGotIt,
}: LocationDisclosureModalProps) {
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
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
            <Text style={styles.iconText}>📍</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            Background Location Required
          </Text>

          {/* Prominent Disclosure body — required by Google Play policy */}
          <Text style={[styles.body, { color: colors.foreground }]}>
            To notify you when you are near your saved stores,{" "}
            <Text style={styles.bold}>Remember2Buy needs background location access</Text>
            {" "}— even when the app is closed or in your pocket.
          </Text>

          <Text style={[styles.body, { color: colors.muted, marginTop: 10 }]}>
            On the next screen, please select{" "}
            <Text style={[styles.bold, { color: colors.primary }]}>
              "Allow all the time"
            </Text>{" "}
            to enable store arrival alerts.
          </Text>

          {/* Usage clarification */}
          <View style={[styles.usageBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.usageItem, { color: colors.muted }]}>
              ✅ Used only to detect when you are near a saved store
            </Text>
            <Text style={[styles.usageItem, { color: colors.muted }]}>
              ✅ Location data is never shared or stored on servers
            </Text>
            <Text style={[styles.usageItem, { color: colors.muted }]}>
              ✅ You can revoke this permission at any time in Settings
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
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
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
  iconText: {
    fontSize: 30,
  },
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
  bold: {
    fontWeight: "700",
  },
  usageBox: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 16,
    gap: 6,
  },
  usageItem: {
    fontSize: 13,
    lineHeight: 19,
  },
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
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
  btnPrimary: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
