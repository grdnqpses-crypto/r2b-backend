import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert, Switch,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function SettingsScreen() {
  const colors = useColors();
  const [isPremium] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const referralCode = "R2B-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I use Remember2Buy to never forget my shopping list! Download it and we both get 1 free week of Premium. Use my code: ${referralCode}`,
        title: "Remember2Buy - Never Forget Your List",
      });
    } catch {}
  };

  const handleUpgrade = () => {
    Alert.alert(
      "Upgrade to Premium",
      "Get unlimited stores, unlimited list items, and full coupon access for just $1.99/week. Cancel anytime.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Subscribe $1.99/week", onPress: () => Alert.alert("Coming Soon", "Payment integration will be available in the next update.") },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Premium Status */}
        <View style={[styles.card, { backgroundColor: isPremium ? colors.success + "11" : colors.primary + "11", borderColor: isPremium ? colors.success + "33" : colors.primary + "33" }]}>
          <View style={styles.row}>
            <IconSymbol name="crown.fill" size={24} color={isPremium ? colors.success : colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: isPremium ? colors.success : colors.primary }]}>
                {isPremium ? "Premium Active" : "Free Plan"}
              </Text>
              <Text style={[styles.cardSub, { color: colors.muted }]}>
                {isPremium ? "Unlimited stores, items, and coupons" : "1 store, 3 items, no coupons"}
              </Text>
            </View>
          </View>
          {!isPremium && (
            <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.primary }]} onPress={handleUpgrade}>
              <Text style={styles.upgradeBtnText}>Upgrade to Premium — $1.99/week</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Referral */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Refer a Friend</Text>
          <Text style={[styles.cardSub, { color: colors.muted }]}>
            Share your referral code. When a friend signs up, you both get 1 free week of Premium.
          </Text>
          <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.codeText, { color: colors.primary }]}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.primary }]} onPress={handleShare}>
            <IconSymbol name="paperplane.fill" size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share My Code</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notifications</Text>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Store Reminders</Text>
              <Text style={[styles.settingDesc, { color: colors.muted }]}>Alert at 0.3 miles and 6 min after arriving</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* How It Works */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>How Reminders Work</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>1. Select your stores in the Stores tab</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>2. Add items to your shopping list</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>3. Keep the app running in background</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>4. First alert fires at 0.3 miles from store</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>5. Second alert fires 6 min after arriving</Text>
        </View>

        {/* Free vs Premium */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Free vs Premium</Text>
          <View style={styles.compareRow}>
            <Text style={[styles.compareFeature, { color: colors.foreground }]}>Stores</Text>
            <Text style={[styles.compareFree, { color: colors.muted }]}>1 store</Text>
            <Text style={[styles.comparePremium, { color: colors.primary }]}>Unlimited</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[styles.compareFeature, { color: colors.foreground }]}>List Items</Text>
            <Text style={[styles.compareFree, { color: colors.muted }]}>3 items</Text>
            <Text style={[styles.comparePremium, { color: colors.primary }]}>Unlimited</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[styles.compareFeature, { color: colors.foreground }]}>Coupons</Text>
            <Text style={[styles.compareFree, { color: colors.muted }]}>No</Text>
            <Text style={[styles.comparePremium, { color: colors.primary }]}>Full Access</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[styles.compareFeature, { color: colors.foreground }]}>Reminders</Text>
            <Text style={[styles.compareFree, { color: colors.muted }]}>Yes</Text>
            <Text style={[styles.comparePremium, { color: colors.primary }]}>Yes</Text>
          </View>
          <View style={styles.compareRow}>
            <Text style={[styles.compareFeature, { color: colors.foreground }]}>Price</Text>
            <Text style={[styles.compareFree, { color: colors.muted }]}>Free</Text>
            <Text style={[styles.comparePremium, { color: colors.primary }]}>$1.99/week</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 20, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, borderWidth: 1, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 13, lineHeight: 18 },
  upgradeBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  upgradeBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  codeBox: { borderRadius: 8, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  codeText: { fontSize: 20, fontWeight: "800", letterSpacing: 2 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, paddingVertical: 12 },
  shareBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingLabel: { fontSize: 14, fontWeight: "600" },
  settingDesc: { fontSize: 12, marginTop: 2 },
  howStep: { fontSize: 13, lineHeight: 22 },
  compareRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  compareFeature: { flex: 1, fontSize: 13 },
  compareFree: { width: 80, fontSize: 13, textAlign: "center" },
  comparePremium: { width: 80, fontSize: 13, fontWeight: "700", textAlign: "center" },
});
