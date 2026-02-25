import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Haptics } from "@/lib/safe-imports";

interface JournalEntryModalProps {
  beliefName: string;
  beliefEmoji: string;
  score: number;
  existingEntry?: string;
  onSave: (entry: string) => void;
  onSkip: () => void;
}

const PROMPTS = [
  "How did you feel during the scan?",
  "What were you thinking about while focusing?",
  "Did anything surprise you about the results?",
  "How strong was your belief in that moment?",
  "What would make your belief even stronger?",
  "Describe the feeling in one word, then explain...",
];

export function JournalEntryModal({
  beliefName,
  beliefEmoji,
  score,
  existingEntry,
  onSave,
  onSkip,
}: JournalEntryModalProps) {
  const colors = useColors();
  const [entry, setEntry] = useState(existingEntry || "");
  const [promptIdx] = useState(() => Math.floor(Math.random() * PROMPTS.length));

  const canSave = entry.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onSave(entry.trim());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>📔</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Belief Journal</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            Record how you felt during your {beliefEmoji} {beliefName} scan
          </Text>
        </View>

        {/* Score reminder */}
        <View style={[styles.scoreReminder, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Text style={[styles.scoreText, { color: colors.primary }]}>
            Your belief field score: {score}/100
          </Text>
        </View>

        {/* Writing prompt */}
        <View style={[styles.promptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.promptLabel, { color: colors.muted }]}>WRITING PROMPT</Text>
          <Text style={[styles.promptText, { color: colors.foreground }]}>
            {PROMPTS[promptIdx]}
          </Text>
        </View>

        {/* Text input */}
        <TextInput
          value={entry}
          onChangeText={setEntry}
          placeholder="Write your thoughts here..."
          placeholderTextColor={colors.muted}
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              borderColor: entry.length > 0 ? colors.primary + "60" : colors.border,
              color: colors.foreground,
            },
          ]}
          multiline
          numberOfLines={8}
          maxLength={500}
          textAlignVertical="top"
          autoFocus
        />

        {/* Character count */}
        <Text style={[styles.charCount, { color: colors.muted }]}>
          {entry.length}/500
        </Text>

        {/* Save button */}
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
            {existingEntry ? "Update Journal Entry" : "Save to Journal"}
          </Text>
        </Pressable>

        {/* Skip button */}
        {!existingEntry && (
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [
              styles.skipBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>Skip for now</Text>
          </Pressable>
        )}

        {/* Close button for editing existing */}
        {existingEntry && (
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [
              styles.skipBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.skipText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 20 },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: "900", marginBottom: 4 },
  headerSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  scoreReminder: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  scoreText: { fontSize: 15, fontWeight: "700" },
  promptCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  promptLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6 },
  promptText: { fontSize: 16, fontWeight: "600", lineHeight: 24 },
  textArea: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 160,
  },
  charCount: { fontSize: 12, textAlign: "right", marginTop: 6, marginBottom: 16 },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  skipBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 10,
  },
  skipText: { fontSize: 15, fontWeight: "600" },
});
