import { useCallback, useEffect, useRef, useState } from "react";
import { Share, Keyboard } from "react-native";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { trpc } from "@/lib/trpc";
import {
  View, Text, FlatList, Pressable, TextInput,
  StyleSheet, Alert, Platform, ActivityIndicator,
  Modal, ScrollView, TouchableOpacity,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { ScreenContainer } from "@/components/screen-container";
import { Confetti } from "@/components/confetti";
import { getAppSettings } from "@/lib/storage";
import { parseItemInput, hasStructuredInput } from "@/lib/parse-item";
import * as Clipboard from "expo-clipboard";
import * as MailComposer from "expo-mail-composer";
import * as SMS from "expo-sms";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  getAllShoppingItems, addShoppingItem, toggleShoppingItem,
  deleteShoppingItem, clearCheckedItems, getTier, getShoppingLists,
  addShoppingList, deleteShoppingList, getListTemplates, saveListTemplate,
  getRecentItems, reorderShoppingItems, updateShoppingItem,
  FREE_ITEM_LIMIT, type ShoppingItem, type Tier, type ShoppingList,
  type ListTemplate, type ItemCategory,
} from "@/lib/storage";

const CATEGORY_ICONS: Record<ItemCategory, string> = {
  produce: "🥦", dairy: "🥛", meat: "🥩", bakery: "🍞", frozen: "🧊",
  beverages: "🥤", snacks: "🍿", household: "🧹", personal: "💊", pharmacy: "💊", other: "📦",
};

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  produce: "Produce", dairy: "Dairy", meat: "Meat & Fish", bakery: "Bakery",
  frozen: "Frozen", beverages: "Beverages", snacks: "Snacks",
  household: "Household", personal: "Personal Care", pharmacy: "Pharmacy", other: "Other",
};

const UNITS = ["", "oz", "lb", "g", "kg", "ml", "L", "gal", "ct", "pk", "box", "can", "bag", "bottle", "bunch", "loaf", "dozen"];

const LIST_COLORS = ["#1565C0", "#7C3AED", "#059669", "#DC2626", "#D97706", "#0891B2", "#BE185D"];
const LIST_ICONS = ["🛒", "🏪", "💊", "🏠", "🎉", "🌿", "🐾", "🍕", "🎄", "🔧"];

export default function ListScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState("default");
  const [tier, setTier] = useState<Tier>("free");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showNewList, setShowNewList] = useState(false);
  const [templates, setTemplates] = useState<ListTemplate[]>([]);
  const [newListName, setNewListName] = useState("");
  const [newListIcon, setNewListIcon] = useState("🛒");
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0]);
  const [undoItem, setUndoItem] = useState<ShoppingItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiEnabled, setConfettiEnabled] = useState(true);
  const prevUncheckedCount = useRef<number>(-1);
  const [showTripPrompt, setShowTripPrompt] = useState(false);
  const [clipboardItems, setClipboardItems] = useState<string[]>([]);
  const [showClipboardImport, setShowClipboardImport] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeScanLocked, setBarcodeScanLocked] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const transcribeMutation = trpc.voice.transcribe.useMutation();

  const loadData = useCallback(async () => {
    const [allItems, listsData, tierData, recent, tplData, appSettings] = await Promise.all([
      getAllShoppingItems(), getShoppingLists(), getTier(), getRecentItems(30), getListTemplates(), getAppSettings(),
    ]);
    setItems(allItems);
    setLists(listsData);
    setTier(tierData);
    setRecentItems(recent);
    setTemplates(tplData);
    setConfettiEnabled(appSettings.confettiEnabled ?? true);
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
    // Clipboard check is deferred to avoid declaration order issue
    setTimeout(() => checkClipboard(), 100);
  }, [loadData])); // eslint-disable-line react-hooks/exhaustive-deps

  const activeItems = items.filter((i) => (i.listId ?? "default") === activeListId);
  const unchecked = activeItems.filter((i) => !i.checked);
  const checked = activeItems.filter((i) => i.checked);
  const atLimit = tier === "free" && unchecked.length >= FREE_ITEM_LIMIT;

  // Confetti: trigger when all items are checked off (and there were items before)
  useEffect(() => {
    const totalActive = activeItems.length;
    const uncheckedCount = unchecked.length;
    if (
      confettiEnabled &&
      totalActive > 0 &&
      uncheckedCount === 0 &&
      prevUncheckedCount.current > 0
    ) {
      setShowConfetti(true);
      setShowTripPrompt(true);
      if (Platform.OS !== "web") {
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 100);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 700);
      }
    }
    prevUncheckedCount.current = uncheckedCount;
  }, [unchecked.length, activeItems.length, confettiEnabled]);

  // Check clipboard for potential shopping list on focus
  const checkClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || text.length < 5 || text.length > 2000) return;
      // Detect if it looks like a list (multiple lines, bullet points, or numbered items)
      const lines = text.split(/[\n\r,;]+/).map((l) => l.trim()).filter((l) => l.length > 1 && l.length < 80);
      const cleaned = lines.map((l) => l.replace(/^[-•*·\d+\.]+\s*/, "").trim()).filter((l) => l.length > 1);
      if (cleaned.length >= 2 && cleaned.length <= 30) {
        setClipboardItems(cleaned);
        setShowClipboardImport(true);
      }
    } catch {}
  }, []);

  const handleClipboardImport = async () => {
    setShowClipboardImport(false);
    for (const item of clipboardItems) {
      const parsed = parseItemInput(item);
      await addShoppingItem(parsed.text, {
        listId: activeListId,
        quantity: parsed.quantity,
        unit: parsed.unit,
        category: parsed.category as ItemCategory | undefined,
      });
    }
    await loadData();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Imported!", `Added ${clipboardItems.length} items from clipboard.`);
    setClipboardItems([]);
    await Clipboard.setStringAsync(""); // Clear so it doesn't re-trigger
  };

  const filteredSuggestions = inputText.trim().length > 0
    ? recentItems.filter((r) => r.toLowerCase().includes(inputText.toLowerCase()) && r.toLowerCase() !== inputText.toLowerCase()).slice(0, 5)
    : [];

  const handleAdd = async (text?: string) => {
    const rawText = (text ?? inputText).trim();
    if (!rawText) return;
    if (atLimit) {
      Alert.alert(t("list.freeLimitReached"), t("list.freeLimitMessage", { limit: FREE_ITEM_LIMIT }), [{ text: t("common.ok") }]);
      return;
    }
    setLoading(true);
    setShowSuggestions(false);
    Keyboard.dismiss();
    // Parse natural language input (e.g., "2 lbs chicken breast")
    const parsed = parseItemInput(rawText);
    await addShoppingItem(parsed.text, {
      listId: activeListId,
      quantity: parsed.quantity,
      unit: parsed.unit,
      category: parsed.category as ItemCategory | undefined,
    });
    setInputText("");
    await loadData();
    setLoading(false);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggle = async (id: string) => {
    await toggleShoppingItem(id);
    await loadData();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Check if all items are now checked (list complete!)
    // We check after loadData so items state is fresh
  };

  const handleDelete = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setUndoItem(item);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndoItem(null), 4000);
    }
    await deleteShoppingItem(id);
    await loadData();
  };

  const handleUndo = async () => {
    if (!undoItem) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoItem(null);
    await addShoppingItem(undoItem.text, {
      listId: undoItem.listId ?? "default",
      category: undoItem.category,
      quantity: undoItem.quantity,
      unit: undoItem.unit,
      note: undoItem.note,
    });
    await loadData();
  };

  const handleExportPDF = async () => {
    if (activeItems.length === 0) {
      Alert.alert(t("list.nothingToShare"), t("list.nothingToShareMessage"));
      return;
    }
    const listName = lists.find((l) => l.id === activeListId)?.name ?? t("list.myList");
    const uncheckedItems = activeItems.filter((i) => !i.checked);
    const checkedItems = activeItems.filter((i) => i.checked);
    const uncheckedRows = uncheckedItems.map((i) => {
      const qty = i.quantity ? `${i.quantity}${i.unit ? " " + i.unit : ""} ` : "";
      const cat = i.category ? `<span style="color:#888;font-size:11px">[${i.category}]</span> ` : "";
      return `<tr><td style="padding:6px 8px">&#9744; ${cat}${qty}${i.text}</td></tr>`;
    }).join("");
    const checkedRows = checkedItems.map((i) => {
      return `<tr><td style="padding:6px 8px;color:#888;text-decoration:line-through">&#9745; ${i.text}</td></tr>`;
    }).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:20px;margin-bottom:4px}p{color:#888;font-size:12px;margin-bottom:16px}table{width:100%;border-collapse:collapse}tr{border-bottom:1px solid #eee}td{font-size:14px}</style></head><body><h1>&#128722; ${listName}</h1><p>Remember 2 Buy &bull; ${new Date().toLocaleDateString()}</p><table>${uncheckedRows}${checkedRows}</table></body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: listName });
      } else {
        Alert.alert("PDF Saved", `Saved to: ${uri}`);
      }
    } catch (e) {
      Alert.alert(t("common.error"), String(e));
    }
  };

  const handleShare = async () => {
    if (activeItems.length === 0) {
      Alert.alert(t("list.nothingToShare"), t("list.nothingToShareMessage"));
      return;
    }
    const listName = lists.find((l) => l.id === activeListId)?.name ?? t("list.myList");
    let message = `${t("app.name")} — ${listName}\n\n`;
    const uncheckedItems = activeItems.filter((i) => !i.checked);
    const checkedItems = activeItems.filter((i) => i.checked);
    if (uncheckedItems.length > 0) {
      message += uncheckedItems.map((i) => {
        const qty = i.quantity ? `${i.quantity}${i.unit ? " " + i.unit : ""} ` : "";
        return `▢ ${qty}${i.text}`;
      }).join("\n");
    }
    if (checkedItems.length > 0) {
      if (uncheckedItems.length > 0) message += "\n\n";
      message += checkedItems.map((i) => `✓ ${i.text}`).join("\n");
    }
    try {
      await Share.share({ message, title: listName });
    } catch { /* user cancelled */ }
  };

  const handleEmailExport = async () => {
    if (activeItems.length === 0) {
      Alert.alert("Nothing to share", "Add some items to your list first.");
      return;
    }
    const listName = lists.find((l) => l.id === activeListId)?.name ?? "My Shopping List";
    const uncheckedItems = activeItems.filter((i) => !i.checked);
    const checkedItems = activeItems.filter((i) => i.checked);
    const uncheckedLines = uncheckedItems.map((i) => {
      const qty = i.quantity ? `${i.quantity}${i.unit ? " " + i.unit : ""} ` : "";
      return `  - ${qty}${i.text}`;
    });
    const checkedLines = checkedItems.map((i) => `  - ${i.text} (got)`);
    const bodyParts = [
      `Shopping List: ${listName}`,
      "",
      uncheckedItems.length > 0 ? "To Buy:" : "",
      ...uncheckedLines,
      checkedItems.length > 0 ? "\nAlready Got:" : "",
      ...checkedLines,
      "",
      "Sent from Remember 2 Buy",
    ].filter(Boolean);
    const body = bodyParts.join("\n");
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Email not available", "Please set up an email account on your device.");
      return;
    }
    await MailComposer.composeAsync({
      subject: `Shopping List: ${listName}`,
      body,
    });
  };
    const handleSMSExport = async () => {
    if (activeItems.length === 0) {
      Alert.alert("Nothing to share", "Add some items to your list first.");
      return;
    }
    const listName = lists.find((l) => l.id === activeListId)?.name ?? "My Shopping List";
    const uncheckedItems = activeItems.filter((i) => !i.checked);
    const lines = uncheckedItems.map((i) => {
      const qty = i.quantity ? `${i.quantity}${i.unit ? " " + i.unit : ""} ` : "";
      return `- ${qty}${i.text}`;
    });
    const message = [`Shopping: ${listName}`, ...lines].join("\n");
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("SMS not available", "SMS is not available on this device.");
      return;
    }
    await SMS.sendSMSAsync([], message);
  };
    const handleClearChecked = async () => {
    const checkedCount = checked.length;
    if (checkedCount === 0) return;
    Alert.alert(
      t("list.clearBoughtItems"),
      t(checkedCount === 1 ? "list.clearBoughtConfirm" : "list.clearBoughtConfirm_plural", { count: checkedCount }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("list.confirmClearButton"), style: "destructive", onPress: async () => { await clearCheckedItems(activeListId); await loadData(); } },
      ]
    );
  };

  const handleLoadTemplate = async (template: ListTemplate) => {
    setShowTemplates(false);
    if (atLimit && tier === "free") {
      Alert.alert(t("list.freeLimitReached"), t("list.freeLimitMessage", { limit: FREE_ITEM_LIMIT }), [{ text: t("common.ok") }]);
      return;
    }
    for (const item of template.items) {
      await addShoppingItem(item.text, {
        listId: activeListId,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
    await loadData();
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveAsTemplate = async () => {
    if (unchecked.length === 0) {
      Alert.alert("No Items", "Add some items to your list first.");
      return;
    }
    const listName = lists.find((l) => l.id === activeListId)?.name ?? "My List";
    await saveListTemplate(listName, unchecked.map((i) => ({ text: i.text, category: i.category, quantity: i.quantity, unit: i.unit })));
    await loadData();
    Alert.alert("Template Saved!", `"${listName}" saved as a template.`);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    await addShoppingList(newListName.trim(), newListIcon, newListColor);
    setNewListName("");
    setNewListIcon("🛒");
    setNewListColor(LIST_COLORS[0]);
    setShowNewList(false);
    await loadData();
  };

  const handleDeleteList = (id: string) => {
    if (id === "default") return;
    const listName = lists.find((l) => l.id === id)?.name ?? "this list";
    Alert.alert("Delete List", `Delete "${listName}"? Items will be moved to My List.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteShoppingList(id);
        if (activeListId === id) setActiveListId("default");
        await loadData();
      }},
    ]);
  };

  const handleVoiceInput = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Voice Input", "Voice input is available on the mobile app.");
      return;
    }
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return;
      setLoading(true);
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const result = await transcribeMutation.mutateAsync({ audioBase64: base64, mimeType: "audio/m4a" });
        if (result.text) {
          // Parse multiple items separated by commas
          const items = result.text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
          if (items.length > 1) {
            for (const item of items) {
              if (!atLimit) await addShoppingItem(item, { listId: activeListId });
            }
            await loadData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else {
            setInputText(result.text.trim());
          }
        }
      } catch {
        Alert.alert("Voice Error", "Could not transcribe audio. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      // Start recording
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Microphone Permission", "Please allow microphone access to use voice input.");
        return;
      }
      setIsRecording(true);
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (barcodeScanLocked) return;
    setBarcodeScanLocked(true);
    setShowBarcodeScanner(false);
    setInputText(data);
    setTimeout(() => setBarcodeScanLocked(false), 2000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleOpenBarcodeScanner = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Barcode Scanner", "Barcode scanning is available on the mobile app.");
      return;
    }
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Camera Permission", "Please allow camera access to scan barcodes.");
        return;
      }
    }
    setBarcodeScanLocked(false);
    setShowBarcodeScanner(true);
  };

  const handleUpdateItemField = async (id: string, field: keyof ShoppingItem, value: unknown) => {
    await updateShoppingItem(id, { [field]: value });
    await loadData();
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => {
    const isExpanded = expandedItemId === item.id;
    return (
      <View>
        <View style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: item.checked ? colors.success + "40" : colors.border }]}>
          {/* Category Dot */}
          <Text style={styles.categoryDot}>{item.category ? CATEGORY_ICONS[item.category] : "📦"}</Text>

          {/* Checkbox */}
          <Pressable
            style={({ pressed }) => [styles.checkbox, {
              borderColor: item.checked ? colors.success : colors.border,
              backgroundColor: item.checked ? colors.success : "transparent",
              opacity: pressed ? 0.7 : 1,
            }]}
            onPress={() => handleToggle(item.id)}
          >
            {item.checked && <IconSymbol name="checkmark" size={12} color="#fff" />}
          </Pressable>

          {/* Text + quantity */}
          <Pressable style={styles.itemTextContainer} onPress={() => setExpandedItemId(isExpanded ? null : item.id)}>
            <Text style={[styles.itemText, {
              color: item.checked ? colors.muted : colors.foreground,
              textDecorationLine: item.checked ? "line-through" : "none",
            }]} numberOfLines={isExpanded ? undefined : 1}>{item.text}</Text>
            {(item.quantity || item.unit || item.note) && (
              <Text style={[styles.itemMeta, { color: colors.muted }]}>
                {item.quantity ? `${item.quantity}${item.unit ? " " + item.unit : ""}` : ""}
                {item.note ? (item.quantity ? " · " : "") + item.note : ""}
              </Text>
            )}
          </Pressable>

          {/* Expand / Delete */}
          <Pressable style={({ pressed }) => [styles.expandBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => setExpandedItemId(isExpanded ? null : item.id)}>
            <IconSymbol name={isExpanded ? "chevron.up" : "chevron.down"} size={16} color={colors.muted} />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]} onPress={() => handleDelete(item.id)}>
            <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {/* Expanded detail editor */}
        {isExpanded && (
          <View style={[styles.expandedPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Category picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {(Object.keys(CATEGORY_ICONS) as ItemCategory[]).map((cat) => (
                <Pressable
                  key={cat}
                  style={[styles.catChip, {
                    backgroundColor: item.category === cat ? colors.primary + "20" : colors.background,
                    borderColor: item.category === cat ? colors.primary : colors.border,
                  }]}
                  onPress={() => handleUpdateItemField(item.id, "category", cat)}
                >
                  <Text style={styles.catChipEmoji}>{CATEGORY_ICONS[cat]}</Text>
                  <Text style={[styles.catChipLabel, { color: item.category === cat ? colors.primary : colors.muted }]}>{CATEGORY_LABELS[cat]}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Quantity + Unit */}
            <View style={styles.qtyRow}>
              <TextInput
                style={[styles.qtyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                placeholder="Qty"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                value={item.quantity?.toString() ?? ""}
                onChangeText={(v) => handleUpdateItemField(item.id, "quantity", v ? parseFloat(v) : undefined)}
                returnKeyType="done"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                {UNITS.map((unit) => (
                  <Pressable
                    key={unit || "none"}
                    style={[styles.unitChip, {
                      backgroundColor: item.unit === unit ? colors.primary : colors.background,
                      borderColor: item.unit === unit ? colors.primary : colors.border,
                    }]}
                    onPress={() => handleUpdateItemField(item.id, "unit", unit || undefined)}
                  >
                    <Text style={[styles.unitChipText, { color: item.unit === unit ? "#fff" : colors.muted }]}>{unit || "—"}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Note */}
            <TextInput
              style={[styles.noteInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Add a note (e.g. organic, store brand only)"
              placeholderTextColor={colors.muted}
              value={item.note ?? ""}
              onChangeText={(v) => handleUpdateItemField(item.id, "note", v || undefined)}
              returnKeyType="done"
            />
          </View>
        )}
      </View>
    );
  };

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <ScreenContainer>
      <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {activeList?.icon ?? "🛒"} {activeList?.name ?? t("list.myList")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {unchecked.length} item{unchecked.length !== 1 ? "s" : ""} to buy
              {checked.length > 0 ? ` · ${checked.length} done` : ""}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {checked.length > 0 && (
              <Pressable style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleClearChecked}>
                <IconSymbol name="checkmark.circle.fill" size={22} color={colors.success} />
              </Pressable>
            )}
            <Pressable style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleShare}>
              <IconSymbol name="square.and.arrow.up" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* List Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listTabs} contentContainerStyle={styles.listTabsContent}>
          {lists.map((list) => (
            <Pressable
              key={list.id}
              style={[styles.listTab, {
                backgroundColor: activeListId === list.id ? list.color : colors.surface,
                borderColor: activeListId === list.id ? list.color : colors.border,
              }]}
              onPress={() => setActiveListId(list.id)}
              onLongPress={() => list.id !== "default" && handleDeleteList(list.id)}
            >
              <Text style={styles.listTabIcon}>{list.icon}</Text>
              <Text style={[styles.listTabName, { color: activeListId === list.id ? "#fff" : colors.foreground }]} numberOfLines={1}>{list.name}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.listTab, styles.addListTab, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowNewList(true)}
          >
            <IconSymbol name="plus" size={16} color={colors.primary} />
          </Pressable>
        </ScrollView>

        {/* Free tier limit bar */}
        {tier === "free" && (
          <View style={[styles.limitBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.limitText, { color: colors.muted }]}>{unchecked.length}/{FREE_ITEM_LIMIT}</Text>
            <View style={[styles.limitTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.limitFill, {
                backgroundColor: atLimit ? colors.error : colors.primary,
                width: `${Math.min((unchecked.length / FREE_ITEM_LIMIT) * 100, 100)}%` as any,
              }]} />
            </View>
            <Text style={[styles.upgradeLink, { color: colors.premium }]}>{t("list.upgradeForUnlimited")}</Text>
          </View>
        )}

        {/* Clipboard Import Banner */}
        {showClipboardImport && clipboardItems.length > 0 && (
          <View style={[styles.clipboardBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 13, fontWeight: "700", color: colors.foreground }]}>
                📋 Clipboard list detected ({clipboardItems.length} items)
              </Text>
              <Text style={[{ fontSize: 11, color: colors.muted, marginTop: 2 }]} numberOfLines={1}>
                {clipboardItems.slice(0, 3).join(", ")}{clipboardItems.length > 3 ? "..." : ""}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginLeft: 8 }}>
              <Pressable
                style={({ pressed }) => [{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                onPress={handleClipboardImport}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Import</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => setShowClipboardImport(false)}
              >
                <Text style={{ fontSize: 12, color: colors.muted }}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        )}
        {/* Input Row */}
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder={t("list.addAnItem")}
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={(v) => { setInputText(v); setShowSuggestions(v.trim().length > 0); }}
            onSubmitEditing={() => handleAdd()}
            returnKeyType="done"
            editable={!atLimit}
            onFocus={() => setShowSuggestions(inputText.trim().length > 0)}
          />
          <Pressable
            style={({ pressed }) => [styles.iconInputBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleVoiceInput}
          >
            {isRecording
              ? <ActivityIndicator size="small" color={colors.error} />
              : <IconSymbol name="mic.fill" size={20} color={isRecording ? colors.error : colors.muted} />}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconInputBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleOpenBarcodeScanner}
          >
            <IconSymbol name="barcode.viewfinder" size={20} color={colors.muted} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: atLimit ? colors.border : colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => handleAdd()}
            disabled={atLimit || loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <IconSymbol name="plus.circle.fill" size={22} color="#fff" />}
          </Pressable>
        </View>

        {/* Natural Language Parse Preview */}
        {inputText.trim().length > 0 && hasStructuredInput(inputText) && (() => {
          const p = parseItemInput(inputText);
          if (!p.quantity && !p.unit) return null;
          return (
            <View style={[styles.parseHint, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
              <Text style={{ fontSize: 11, color: colors.primary }}>
                ✨ Will add: <Text style={{ fontWeight: "700" }}>{p.quantity ? `${p.quantity}${p.unit ? " " + p.unit : ""} ` : ""}{p.text}</Text>
                {p.category ? <Text style={{ color: colors.muted }}> · {p.category}</Text> : null}
              </Text>
            </View>
          );
        })()}
        {/* Autocomplete suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <View style={[styles.suggestionsBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {filteredSuggestions.map((s) => (
              <Pressable
                key={s}
                style={({ pressed }) => [styles.suggestionItem, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                onPress={() => { setInputText(s); setShowSuggestions(false); handleAdd(s); }}
              >
                <IconSymbol name="clock" size={14} color={colors.muted} />
                <Text style={[styles.suggestionText, { color: colors.foreground }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Quick Actions Row */}
        <View style={styles.quickActions}>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setShowTemplates(true)}
          >
            <Text style={styles.quickBtnEmoji}>📋</Text>
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>Templates</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleSaveAsTemplate}
          >
            <IconSymbol name="bookmark" size={16} color={colors.primary} />
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>Save List</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleShare}
          >
            <IconSymbol name="square.and.arrow.up" size={16} color={colors.primary} />
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>Share</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleExportPDF}
          >
            <Text style={styles.quickBtnEmoji}>📄</Text>
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>PDF</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleEmailExport}
          >
            <Text style={styles.quickBtnEmoji}>✉️</Text>
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>Email</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleSMSExport}
          >
            <Text style={styles.quickBtnEmoji}>💬</Text>
            <Text style={[styles.quickBtnText, { color: colors.foreground }]}>SMS</Text>
          </Pressable>
        </View>

        {/* List */}
        {activeItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t("list.noItemsYet")}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>{t("list.noItemsSubtitle")}</Text>
          </View>
        ) : (
          <FlatList
            data={[...unchecked, ...checked]}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Trip Log Contextual Prompt */}
        {showTripPrompt && checked.length > 0 && unchecked.length === 0 && (
          <View style={[styles.tripPrompt, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
            <Text style={[styles.tripPromptEmoji]}>🛒</Text>
            <View style={styles.tripPromptText}>
              <Text style={[styles.tripPromptTitle, { color: colors.foreground }]}>Shopping complete!</Text>
              <Text style={[styles.tripPromptSub, { color: colors.muted }]}>Log this trip to track your spending?</Text>
            </View>
            <View style={styles.tripPromptActions}>
              <Pressable
                style={({ pressed }) => [styles.tripPromptBtn, { backgroundColor: colors.success, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => { setShowTripPrompt(false); router.push("/budget" as never); }}
              >
                <Text style={styles.tripPromptBtnText}>Log Trip</Text>
              </Pressable>
              <Pressable onPress={() => setShowTripPrompt(false)} style={{ padding: 8 }}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
              </Pressable>
            </View>
          </View>
        )}
        {/* Undo Snackbar */}
        {undoItem && (
          <View style={[styles.snackbar, { backgroundColor: colors.foreground }]}>
            <Text style={[styles.snackbarText, { color: colors.background }]}>"{undoItem.text}" removed</Text>
            <Pressable onPress={handleUndo}>
              <Text style={[styles.snackbarUndo, { color: colors.primary }]}>UNDO</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Barcode Scanner Modal */}
      <Modal visible={showBarcodeScanner} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <View style={{ position: "absolute", top: 60, left: 16, right: 16, zIndex: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>📷 Scan Barcode</Text>
            <Pressable onPress={() => setShowBarcodeScanner(false)} style={{ padding: 8 }}>
              <IconSymbol name="xmark.circle.fill" size={32} color="#fff" />
            </Pressable>
          </View>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "code128", "code39", "qr", "upc_a", "upc_e"] }}
            onBarcodeScanned={barcodeScanLocked ? undefined : handleBarcodeScanned}
          />
          <View style={{ position: "absolute", bottom: 60, left: 0, right: 0, alignItems: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Point camera at a barcode or QR code</Text>
          </View>
        </View>
      </Modal>

      {/* Templates Modal */}
      <Modal visible={showTemplates} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>📋 Templates</Text>
            <Pressable onPress={() => setShowTemplates(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <FlatList
            data={templates}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item: tpl }) => (
              <Pressable
                style={({ pressed }) => [styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => handleLoadTemplate(tpl)}
              >
                <Text style={styles.templateName}>{tpl.name}</Text>
                <Text style={[styles.templateCount, { color: colors.muted }]}>{tpl.items.length} items</Text>
                <Text style={[styles.templateItems, { color: colors.muted }]} numberOfLines={2}>
                  {tpl.items.slice(0, 4).map((i) => i.text).join(", ")}{tpl.items.length > 4 ? "..." : ""}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* New List Modal */}
      <Modal visible={showNewList} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New List</Text>
            <Pressable onPress={() => setShowNewList(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <TextInput
              style={[styles.newListInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              placeholder="List name (e.g. Costco, Pharmacy)"
              placeholderTextColor={colors.muted}
              value={newListName}
              onChangeText={setNewListName}
              returnKeyType="done"
              autoFocus
            />
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Choose an icon</Text>
            <View style={styles.iconGrid}>
              {LIST_ICONS.map((icon) => (
                <Pressable
                  key={icon}
                  style={[styles.iconOption, { borderColor: newListIcon === icon ? colors.primary : colors.border, backgroundColor: newListIcon === icon ? colors.primary + "20" : colors.surface }]}
                  onPress={() => setNewListIcon(icon)}
                >
                  <Text style={styles.iconOptionEmoji}>{icon}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.sectionLabel, { color: colors.muted }]}>Choose a color</Text>
            <View style={styles.colorRow}>
              {LIST_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[styles.colorDot, { backgroundColor: color, borderWidth: newListColor === color ? 3 : 0, borderColor: colors.foreground }]}
                  onPress={() => setNewListColor(color)}
                />
              ))}
            </View>
            <Pressable
              style={[styles.createListBtn, { backgroundColor: newListName.trim() ? colors.primary : colors.border }]}
              onPress={handleCreateList}
              disabled={!newListName.trim()}
            >
              <Text style={styles.createListBtnText}>Create List</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 4 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  listTabs: { marginBottom: 10 },
  listTabsContent: { gap: 8, paddingVertical: 4 },
  listTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, maxWidth: 140 },
  addListTab: { paddingHorizontal: 12, paddingVertical: 7 },
  listTabIcon: { fontSize: 14 },
  listTabName: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
  limitBar: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10, gap: 8 },
  limitText: { fontSize: 12, minWidth: 40 },
  limitTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  limitFill: { height: 4, borderRadius: 2 },
  upgradeLink: { fontSize: 12, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8 },
  input: { flex: 1, fontSize: 16, paddingVertical: 4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  iconInputBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  suggestionsBox: { borderRadius: 12, borderWidth: 1, marginBottom: 8, overflow: "hidden" },
  suggestionItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5 },
  suggestionText: { fontSize: 15 },
  quickActions: { flexDirection: "row", gap: 8, marginBottom: 12 },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  quickBtnEmoji: { fontSize: 14 },
  quickBtnText: { fontSize: 12, fontWeight: "600" },
  listContent: { paddingBottom: 80 },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  categoryDot: { fontSize: 16, width: 22, textAlign: "center" },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  itemTextContainer: { flex: 1 },
  itemText: { fontSize: 15, lineHeight: 20 },
  itemMeta: { fontSize: 12, marginTop: 2 },
  expandBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  expandedPanel: { marginTop: 2, marginBottom: 4, borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  categoryScroll: { marginBottom: 4 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 6 },
  catChipEmoji: { fontSize: 13 },
  catChipLabel: { fontSize: 12, fontWeight: "500" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyInput: { width: 70, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  unitScroll: { flex: 1 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, marginRight: 6 },
  unitChipText: { fontSize: 12, fontWeight: "500" },
  noteInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  clipboardBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  parseHint: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginBottom: 4 },
  tripPrompt: { flexDirection: "row", alignItems: "center", margin: 12, padding: 12, borderRadius: 14, borderWidth: 1, gap: 10 },
  tripPromptEmoji: { fontSize: 24 },
  tripPromptText: { flex: 1 },
  tripPromptTitle: { fontSize: 14, fontWeight: "700" },
  tripPromptSub: { fontSize: 12, marginTop: 1 },
  tripPromptActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  tripPromptBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tripPromptBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  snackbar: { position: "absolute", bottom: 16, left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12 },
  snackbarText: { fontSize: 14, flex: 1 },
  snackbarUndo: { fontSize: 14, fontWeight: "700", marginLeft: 12 },
  modal: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  templateCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  templateName: { fontSize: 16, fontWeight: "700" },
  templateCount: { fontSize: 12 },
  templateItems: { fontSize: 13, lineHeight: 18 },
  newListInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconOption: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  iconOptionEmoji: { fontSize: 22 },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  createListBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  createListBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
