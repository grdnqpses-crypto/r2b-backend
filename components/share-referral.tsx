/**
 * ShareReferral — Share & Earn screen.
 *
 * Shows the user's referral code, lets them share it, and allows
 * entering a friend's code to claim a free week.
 */
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "@/lib/safe-imports";
import { Haptics } from "@/lib/safe-imports";
import { useReferral } from "@/hooks/use-referral";

interface ShareReferralProps {
  onDismiss: () => void;
  onFreeWeekEarned?: () => void;
}

export function ShareReferral({ onDismiss, onFreeWeekEarned }: ShareReferralProps) {
  const colors = useColors();
  const { referral, shareReferral, applyReferralCode } = useReferral();
  const [codeInput, setCodeInput] = useState("");
  const [applying, setApplying] = useState(false);

  const handleApplyCode = async () => {
    if (!codeInput.trim()) return;
    setApplying(true);
    const result = await applyReferralCode(codeInput);
    setApplying(false);
    if (result.success) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Free Week Unlocked! 🎉", result.message, [
        {
          text: "Awesome!",
          onPress: () => {
            onFreeWeekEarned?.();
            onDismiss();
          },
        },
      ]);
    } else {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Code Not Applied", result.message);
    }
    setCodeInput("");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(155,122,255,0.15)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Share & Earn</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Give a free week, get a free week
          </Text>
        </View>
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.closeBtnText, { color: colors.muted }]}>✕</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero card */}
        <LinearGradient
          colors={["#9B7AFF", "#6B4FFF"]}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>Invite a Friend</Text>
          <Text style={styles.heroDesc}>
            When your friend installs item Field Detector using your code,{" "}
            <Text style={{ fontWeight: "800" }}>you both get 1 free week of premium</Text> — unlimited stores, unlimited items, full coupon section.
          </Text>
        </LinearGradient>

        {/* My referral code */}
        <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.primary + "40" }]}>
          <Text style={[styles.codeLabel, { color: colors.muted }]}>YOUR REFERRAL CODE</Text>
          <Text style={[styles.codeValue, { color: colors.primary }]}>{referral.myCode}</Text>
          <Text style={[styles.codeHint, { color: colors.muted }]}>
            Share this code with friends. When they enter it in the app, you both get a free week!
          </Text>

          {/* Stats */}
          {referral.referralCount > 0 && (
            <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {referral.referralCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Friends Referred</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {referral.freeWeeksEarned}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Free Weeks Earned</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {referral.freeWeeksRemaining}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Weeks Remaining</Text>
              </View>
            </View>
          )}

          {/* Share button */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              shareReferral();
            }}
            style={({ pressed }) => [
              styles.shareBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={styles.shareBtnText}>📤 Share My Referral Link</Text>
          </Pressable>
        </View>

        {/* Enter a friend's code */}
        {!referral.referredBy ? (
          <View style={[styles.enterCodeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.enterCodeTitle, { color: colors.foreground }]}>
              Have a Friend's Code?
            </Text>
            <Text style={[styles.enterCodeDesc, { color: colors.muted }]}>
              Enter a referral code from a friend to unlock your free week of premium.
            </Text>
            <View style={styles.enterCodeRow}>
              <TextInput
                value={codeInput}
                onChangeText={(t) => setCodeInput(t.toUpperCase())}
                placeholder="Enter code..."
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                maxLength={6}
                style={[
                  styles.codeInput,
                  { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                returnKeyType="done"
                onSubmitEditing={handleApplyCode}
              />
              <Pressable
                onPress={handleApplyCode}
                disabled={applying || !codeInput.trim()}
                style={({ pressed }) => [
                  styles.applyBtn,
                  {
                    backgroundColor: codeInput.trim() ? colors.primary : colors.border,
                    opacity: pressed || applying ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.applyBtnText, { color: codeInput.trim() ? "#fff" : colors.muted }]}>
                  {applying ? "..." : "Apply"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.alreadyReferredCard, { backgroundColor: colors.success + "10", borderColor: colors.success + "30" }]}>
            <Text style={styles.alreadyReferredEmoji}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.alreadyReferredTitle, { color: colors.success }]}>
                Referral Applied!
              </Text>
              <Text style={[styles.alreadyReferredDesc, { color: colors.muted }]}>
                You used code <Text style={{ fontWeight: "700" }}>{referral.referredBy}</Text> and earned a free week.
              </Text>
            </View>
          </View>
        )}

        {/* How it works */}
        <View style={[styles.howCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.howTitle, { color: colors.foreground }]}>How It Works</Text>
          {[
            { step: "1", text: "Tap \"Share My Referral Link\" above" },
            { step: "2", text: "Your friend installs Belief Field Detector" },
            { step: "3", text: "They enter your code in the Share & Earn screen" },
            { step: "4", text: "You both instantly get 1 free week of premium!" },
          ].map(({ step, text }) => (
            <View key={step} style={styles.howStep}>
              <View style={[styles.howStepNum, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.howStepNumText, { color: colors.primary }]}>{step}</Text>
              </View>
              <Text style={[styles.howStepText, { color: colors.muted }]}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 20, fontWeight: "600" },
  scrollContent: { paddingHorizontal: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: "900", color: "#fff", marginBottom: 8 },
  heroDesc: { fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 22 },
  codeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  codeLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  codeValue: { fontSize: 40, fontWeight: "900", letterSpacing: 6, marginBottom: 8 },
  codeHint: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2, textAlign: "center" },
  statDivider: { width: 1, height: 36 },
  shareBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  enterCodeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  enterCodeTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  enterCodeDesc: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  enterCodeRow: { flexDirection: "row", gap: 10 },
  codeInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
  },
  applyBtn: {
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnText: { fontSize: 15, fontWeight: "700" },
  alreadyReferredCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  alreadyReferredEmoji: { fontSize: 28 },
  alreadyReferredTitle: { fontSize: 15, fontWeight: "700" },
  alreadyReferredDesc: { fontSize: 13, marginTop: 2 },
  howCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  howTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  howStep: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  howStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  howStepNumText: { fontSize: 14, fontWeight: "800" },
  howStepText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
