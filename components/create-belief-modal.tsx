import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { CUSTOM_EMOJI_OPTIONS, createCustomItem, type ItemOption } from "@/constants/beliefs";
import { Haptics } from "@/lib/safe-imports";

interface CreateItemModalProps {
  onSave: (item: ItemOption) => void;
  onCancel: () => void;
}

export function CreateItemModal({ onSave, onCancel }: CreateItemModalProps) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [description, setDescription] = useState("");

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const item = createCustomitem(
      name.trim(),
      emoji,
      description.trim() || `My personal item in ${name.trim()}`
    );
    onSave(item);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.header, { color: colors.foreground }]}>Create Your item</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Add anything — if you need it, add it to your list
        </Text>

        {/* Emoji picker */}
        <Text style={[styles.label, { color: colors.foreground }]}>Choose an Icon</Text>
        <View style={styles.emojiGrid}>
          {CUSTOM_EMOJI_OPTIONS.map((e) => (
            <Pressable
              key={e}
              onPress={() => {
                setEmoji(e);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.emojiBtn,
                {
                  backgroundColor: emoji === e ? colors.primary + "30" : colors.surface,
                  borderColor: emoji === e ? colors.primary : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={styles.emojiBtnText}>{e}</Text>
            </Pressable>
          ))}
        </View>

        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.previewEmoji}>{emoji}</Text>
          <Text style={[styles.previewName, { color: colors.foreground }]}>
            {name || "Your item"}
          </Text>
        </View>

        {/* Name input */}
        <Text style={[styles.label, { color: colors.foreground }]}>item Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Unicorns, Time Travel, My Lucky Charm..."
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
          ]}
          maxLength={40}
          returnKeyType="next"
        />

        {/* Description input */}
        <Text style={[styles.label, { color: colors.foreground }]}>Description (optional)</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What does this item mean to you?"
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
          ]}
          multiline
          numberOfLines={3}
          maxLength={120}
          returnKeyType="done"
        />

        {/* Buttons */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: canSave ? colors.primary : colors.border,
              opacity: pressed && canSave ? 0.9 : 1,
              transform: [{ scale: pressed && canSave ? 0.97 : 1 }],
            },
          ]}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>
            {canSave ? `Create "${name.trim()}" item` : "Enter a Name to Continue"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelBtn,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { fontSize: 28, fontWeight: "900", textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtnText: { fontSize: 22 },
  preview: {
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  previewEmoji: { fontSize: 48, marginBottom: 8 },
  previewName: { fontSize: 20, fontWeight: "800" },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 10,
  },
  cancelText: { fontSize: 15, fontWeight: "600" },
});
