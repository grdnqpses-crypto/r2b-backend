import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface Coupon {
  id: string;
  title: string;
  source: string;
  savedAt: number;
  imageUri?: string;
}

const STORAGE_KEY = "@r2b_coupons";

const COUPON_SITES = [
  { name: "Coupons.com", url: "https://www.coupons.com" },
  { name: "RetailMeNot", url: "https://www.retailmenot.com" },
  { name: "Honey", url: "https://www.joinhoney.com" },
  { name: "Rakuten", url: "https://www.rakuten.com" },
  { name: "Ibotta", url: "https://home.ibotta.com" },
  { name: "Flipp", url: "https://flipp.com" },
  { name: "Grocery TV", url: "https://www.grocery.tv" },
];

export default function CouponsScreen() {
  const colors = useColors();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isPremium] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) setCoupons(JSON.parse(v));
    });
  }, []);

  const save = async (updated: Coupon[]) => {
    setCoupons(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteCoupon = async (id: string) => {
    await save(coupons.filter((c) => c.id !== id));
  };

  const openSite = (url: string) => {
    if (!isPremium) {
      Alert.alert("Premium Feature", "Coupon websites require a Premium subscription ($1.99/week).", [{ text: "OK" }]);
      return;
    }
    Linking.openURL(url);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Coupons</Text>
          <Text style={styles.headerSub}>Save money on every trip</Text>
        </View>

        {/* Premium gate */}
        {!isPremium && (
          <View style={[styles.premiumCard, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
            <IconSymbol name="crown.fill" size={28} color={colors.primary} />
            <Text style={[styles.premiumTitle, { color: colors.primary }]}>Premium Feature</Text>
            <Text style={[styles.premiumSub, { color: colors.foreground }]}>
              Upgrade to Premium to access coupon websites, save coupons, and scan barcodes.
            </Text>
            <TouchableOpacity style={[styles.premiumBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.premiumBtnText}>Upgrade — $1.99/week</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Coupon Websites */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Coupon Websites</Text>
          <Text style={[styles.sectionSub, { color: colors.muted }]}>Browse and clip coupons from top sites</Text>
          {COUPON_SITES.map((site) => (
            <TouchableOpacity
              key={site.name}
              style={[styles.siteRow, { borderBottomColor: colors.border }]}
              onPress={() => openSite(site.url)}
            >
              <IconSymbol name="globe" size={20} color={colors.primary} />
              <Text style={[styles.siteName, { color: colors.foreground }]}>{site.name}</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Saved Coupons */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved Coupons ({coupons.length})</Text>
          {coupons.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="tag.fill" size={36} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>No coupons saved yet</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>Browse the sites above to find deals</Text>
            </View>
          ) : (
            coupons.map((coupon) => (
              <View key={coupon.id} style={[styles.couponRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.couponTitle, { color: colors.foreground }]}>{coupon.title}</Text>
                  <Text style={[styles.couponSource, { color: colors.muted }]}>
                    {coupon.source} · {new Date(coupon.savedAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteCoupon(coupon.id)}>
                  <IconSymbol name="trash.fill" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 20, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  premiumCard: { margin: 16, borderRadius: 12, padding: 20, borderWidth: 1, alignItems: "center", gap: 8 },
  premiumTitle: { fontSize: 17, fontWeight: "800" },
  premiumSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  premiumBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
  premiumBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  section: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderWidth: 1, gap: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  sectionSub: { fontSize: 12, marginBottom: 8 },
  siteRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  siteName: { flex: 1, fontSize: 14, fontWeight: "500" },
  emptyState: { alignItems: "center", paddingVertical: 24, gap: 6 },
  emptyText: { fontSize: 15, fontWeight: "600" },
  emptySub: { fontSize: 13 },
  couponRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  couponTitle: { fontSize: 14, fontWeight: "600" },
  couponSource: { fontSize: 12, marginTop: 2 },
});
