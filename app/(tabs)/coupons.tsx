import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, StyleSheet,
  Alert, Platform, Modal, Image, ScrollView, TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getCoupons, addCoupon, deleteCoupon, getTier,
  type Coupon, type Tier,
} from "@/lib/storage";

export default function CouponsScreen() {
  const colors = useColors();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tier, setTier] = useState<Tier>("free");
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(false);

  const loadCoupons = useCallback(async () => {
    const [couponsData, tierData] = await Promise.all([getCoupons(), getTier()]);
    setCoupons(couponsData);
    setTier(tierData);
  }, []);

  useFocusEffect(useCallback(() => { loadCoupons(); }, [loadCoupons]));

  const handleAddFromCamera = async () => {
    if (tier !== "premium") {
      Alert.alert("Premium Feature", "Coupon storage is a Premium feature. Upgrade to save unlimited coupons.", [{ text: "OK" }]);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera Permission", "Camera access is required to scan coupons.", [{ text: "OK" }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false });
    if (result.canceled || !result.assets[0]) return;
    setLoading(true);
    try {
      await addCoupon({ imageUri: result.assets[0].uri });
      await loadCoupons();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to save coupon.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFromLibrary = async () => {
    if (tier !== "premium") {
      Alert.alert("Premium Feature", "Coupon storage is a Premium feature. Upgrade to save unlimited coupons.", [{ text: "OK" }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setLoading(true);
    try {
      await addCoupon({ imageUri: result.assets[0].uri });
      await loadCoupons();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to save coupon.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoupon = (id: string) => {
    Alert.alert("Delete Coupon", "Remove this coupon?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteCoupon(id);
        await loadCoupons();
        setSelectedCoupon(null);
      }},
    ]);
  };

  const renderCoupon = ({ item }: { item: Coupon }) => (
    <Pressable
      style={({ pressed }) => [styles.couponCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
      onPress={() => setSelectedCoupon(item)}
    >
      <Image source={{ uri: item.imageUri }} style={styles.couponThumb} resizeMode="cover" />
      <View style={styles.couponInfo}>
        {item.storeName && <Text style={[styles.couponStore, { color: colors.foreground }]} numberOfLines={1}>{item.storeName}</Text>}
        {item.description && <Text style={[styles.couponDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>}
        <Text style={[styles.couponDate, { color: colors.muted }]}>
          Added {new Date(item.addedAt).toLocaleDateString()}
        </Text>
      </View>
      <IconSymbol name="chevron.right" size={16} color={colors.muted} />
    </Pressable>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Coupons</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{coupons.length} saved</Text>
        </View>

        {/* Add Buttons */}
        <View style={styles.addRow}>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: tier === "premium" ? colors.primary : colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleAddFromCamera}
          >
            <IconSymbol name="camera.fill" size={18} color={tier === "premium" ? "#fff" : colors.muted} />
            <Text style={[styles.addBtnText, { color: tier === "premium" ? "#fff" : colors.muted }]}>
              Scan {tier !== "premium" ? "🔒" : ""}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: tier === "premium" ? colors.primary : colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleAddFromLibrary}
          >
            <IconSymbol name="photo.fill" size={18} color={tier === "premium" ? "#fff" : colors.muted} />
            <Text style={[styles.addBtnText, { color: tier === "premium" ? "#fff" : colors.muted }]}>
              Import {tier !== "premium" ? "🔒" : ""}
            </Text>
          </Pressable>
        </View>

        {/* Premium Upsell */}
        {tier !== "premium" && (
          <View style={[styles.upsellCard, { backgroundColor: colors.premium + "15", borderColor: colors.premium + "40" }]}>
            <IconSymbol name="crown.fill" size={20} color={colors.premium} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.upsellTitle, { color: colors.premium }]}>Premium Feature</Text>
              <Text style={[styles.upsellDesc, { color: colors.foreground }]}>
                Save and organize coupons from your camera or photo library. Upgrade to Premium to unlock.
              </Text>
            </View>
          </View>
        )}

        {/* Coupons List */}
        {coupons.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏷️</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No coupons saved</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {tier === "premium"
                ? "Scan or import coupon images to save them here."
                : "Upgrade to Premium to save and organize your coupons."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={coupons}
            keyExtractor={(item) => item.id}
            renderItem={renderCoupon}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </View>

      {/* Coupon Detail Modal */}
      <Modal visible={!!selectedCoupon} animationType="slide" presentationStyle="pageSheet">
        {selectedCoupon && (
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Coupon</Text>
              <Pressable onPress={() => setSelectedCoupon(null)}>
                <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Image
                source={{ uri: selectedCoupon.imageUri }}
                style={styles.couponFullImage}
                resizeMode="contain"
              />
              {selectedCoupon.storeName && (
                <Text style={[styles.modalStoreName, { color: colors.foreground }]}>{selectedCoupon.storeName}</Text>
              )}
              {selectedCoupon.description && (
                <Text style={[styles.modalDesc, { color: colors.muted }]}>{selectedCoupon.description}</Text>
              )}
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, { backgroundColor: colors.error + "20", opacity: pressed ? 0.8 : 1 }]}
                onPress={() => handleDeleteCoupon(selectedCoupon.id)}
              >
                <IconSymbol name="trash.fill" size={16} color={colors.error} />
                <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete Coupon</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  addRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  addBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1 },
  addBtnText: { fontSize: 14, fontWeight: "600" },
  upsellCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  upsellTitle: { fontSize: 14, fontWeight: "700", marginBottom: 3 },
  upsellDesc: { fontSize: 13, lineHeight: 18 },
  listContent: { paddingBottom: 20 },
  couponCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, overflow: "hidden", gap: 12 },
  couponThumb: { width: 80, height: 70 },
  couponInfo: { flex: 1, paddingVertical: 10, gap: 3 },
  couponStore: { fontSize: 14, fontWeight: "600" },
  couponDesc: { fontSize: 12 },
  couponDate: { fontSize: 11 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },
  modal: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalContent: { padding: 20, gap: 12 },
  couponFullImage: { width: "100%", height: 300, borderRadius: 12 },
  modalStoreName: { fontSize: 18, fontWeight: "700" },
  modalDesc: { fontSize: 15, lineHeight: 22 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  deleteBtnText: { fontSize: 15, fontWeight: "600" },
});
