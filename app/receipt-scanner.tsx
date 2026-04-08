import { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, Alert, Image, ActivityIndicator, ScrollView, TextInput, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { addTripLog } from "@/lib/storage";
import { trpc } from "@/lib/trpc";

interface ParsedReceipt {
  storeName: string;
  total: number;
  items: { name: string; price: number }[];
  date: string;
}

export default function ReceiptScannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [total, setTotal] = useState("");
  const [notes, setNotes] = useState("");

  const scanReceiptMutation = trpc.ai.scanReceipt.useMutation();

  const pickImage = async (source: "camera" | "gallery") => {
    let result;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera permission required", "Please allow camera access in Settings to scan receipts.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: true });
    }

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setParsed(null);
      setScanning(true);

      const base64 = asset.base64;
      if (!base64) {
        // No base64 data — fall back to manual entry
        setScanning(false);
        setShowSaveModal(true);
        return;
      }

      try {
        const scanResult = await scanReceiptMutation.mutateAsync({
          imageBase64: base64,
          mimeType: "image/jpeg",
        });

        const receiptData: ParsedReceipt = {
          storeName: scanResult.storeName,
          total: scanResult.total,
          items: scanResult.items,
          date: scanResult.date,
        };

        setParsed(receiptData);
        // Pre-fill the save modal with AI-extracted data
        setStoreName(receiptData.storeName !== "Unknown Store" ? receiptData.storeName : "");
        setTotal(receiptData.total > 0 ? receiptData.total.toFixed(2) : "");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        // AI scan failed — fall back gracefully to manual entry
        Alert.alert(
          "AI Scan Failed",
          "Could not automatically read the receipt. Please enter the details manually.",
          [{ text: "OK" }]
        );
        setShowSaveModal(true);
      } finally {
        setScanning(false);
      }
    }
  };

  const handleSaveTrip = async () => {
    const amount = parseFloat(total);
    if (!storeName.trim() || isNaN(amount)) {
      Alert.alert("Please enter a store name and total amount");
      return;
    }
    await addTripLog({
      storeName: storeName.trim(),
      date: Date.now(),
      itemsBought: parsed?.items.length ?? 0,
      totalSpent: amount,
      savedAmount: 0,
      notes: notes.trim() || undefined,
    });
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Trip Saved!", "Your receipt has been logged to the Budget tracker.", [
      { text: "View Budget", onPress: () => router.replace("/budget") },
      { text: "Done", onPress: () => router.back() },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>📷 Receipt Scanner</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Scan receipts to auto-log your trips</Text>
          </View>
        </View>

        {!imageUri ? (
          <>
            <View style={[styles.scanArea, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 64 }}>🧾</Text>
              <Text style={[styles.scanTitle, { color: colors.foreground }]}>Scan Your Receipt</Text>
              <Text style={[styles.scanDesc, { color: colors.muted }]}>
                Take a photo or choose from your gallery. Our AI will automatically extract the store name, total, and items.
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [styles.scanBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => pickImage("camera")}
              >
                <Text style={{ fontSize: 24 }}>📷</Text>
                <Text style={styles.scanBtnText}>Take Photo</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.scanBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => pickImage("gallery")}
              >
                <Text style={{ fontSize: 24 }}>🖼</Text>
                <Text style={[styles.scanBtnText, { color: colors.foreground }]}>Choose Photo</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.manualBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setShowSaveModal(true)}
            >
              <Text style={[styles.manualBtnText, { color: colors.muted }]}>Or enter manually</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Image source={{ uri: imageUri }} style={[styles.receiptImage, { borderColor: colors.border }]} resizeMode="contain" />

            {scanning && (
              <View style={[styles.scanningCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.scanningText, { color: colors.primary }]}>AI is reading your receipt...</Text>
              </View>
            )}

            {parsed && !scanning && (
              <View style={[styles.parsedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.parsedTitle, { color: colors.foreground }]}>✅ Receipt Scanned</Text>
                <View style={styles.parsedRow}>
                  <Text style={[styles.parsedLabel, { color: colors.muted }]}>Store:</Text>
                  <Text style={[styles.parsedValue, { color: colors.foreground }]}>{parsed.storeName}</Text>
                </View>
                <View style={styles.parsedRow}>
                  <Text style={[styles.parsedLabel, { color: colors.muted }]}>Total:</Text>
                  <Text style={[styles.parsedValue, { color: colors.success, fontWeight: "700" }]}>${parsed.total.toFixed(2)}</Text>
                </View>
                {parsed.items.length > 0 && (
                  <View>
                    <Text style={[styles.parsedLabel, { color: colors.muted, marginBottom: 6 }]}>Items ({parsed.items.length}):</Text>
                    {parsed.items.slice(0, 5).map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                        <Text style={[styles.itemPrice, { color: colors.muted }]}>${item.price.toFixed(2)}</Text>
                      </View>
                    ))}
                    {parsed.items.length > 5 && (
                      <Text style={[styles.moreItems, { color: colors.muted }]}>+{parsed.items.length - 5} more items</Text>
                    )}
                  </View>
                )}
                <Pressable
                  style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => setShowSaveModal(true)}
                >
                  <Text style={styles.saveBtnText}>Save to Budget Tracker</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.rescanBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              onPress={() => { setImageUri(null); setParsed(null); }}
            >
              <Text style={[styles.rescanBtnText, { color: colors.muted }]}>Scan Another Receipt</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Save Modal */}
      <Modal visible={showSaveModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSaveModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Save Trip</Text>
            <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]} onPress={() => setShowSaveModal(false)}>
              <IconSymbol name="xmark.circle.fill" size={24} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Store Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Kroger, Walmart"
              placeholderTextColor={colors.muted}
            />
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Total Amount *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={total}
              onChangeText={setTotal}
              placeholder="e.g. 47.83"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Weekly groceries, holiday shopping..."
              placeholderTextColor={colors.muted}
            />
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSaveTrip}
            >
              <Text style={styles.saveBtnText}>Save Trip to Budget</Text>
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
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 2 },
  scanArea: { borderRadius: 20, borderWidth: 2, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 12, marginBottom: 20 },
  scanTitle: { fontSize: 20, fontWeight: "700" },
  scanDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  scanBtn: { flex: 1, borderRadius: 16, padding: 20, alignItems: "center", gap: 8 },
  scanBtnText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  manualBtn: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center", marginBottom: 20 },
  manualBtnText: { fontSize: 14 },
  receiptImage: { width: "100%", height: 300, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  scanningCard: { borderRadius: 16, borderWidth: 1, padding: 20, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  scanningText: { fontSize: 15, fontWeight: "600" },
  parsedCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, gap: 10 },
  parsedTitle: { fontSize: 16, fontWeight: "700" },
  parsedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  parsedLabel: { fontSize: 13, fontWeight: "600" },
  parsedValue: { fontSize: 14 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemName: { fontSize: 13, flex: 1 },
  itemPrice: { fontSize: 13 },
  moreItems: { fontSize: 12, marginTop: 4 },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  rescanBtn: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center" },
  rescanBtnText: { fontSize: 14 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 24 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalBody: { padding: 20, gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4, marginTop: 8 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 4 },
});
