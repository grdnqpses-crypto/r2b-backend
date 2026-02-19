import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import { type FamilyProfile, PROFILE_EMOJIS } from "@/hooks/use-family-profiles";

interface FamilyProfilesProps {
  profiles: FamilyProfile[];
  activeProfile: FamilyProfile | null;
  onAddProfile: (name: string, emoji: string) => void;
  onSwitchProfile: (id: string) => void;
  onRemoveProfile: (id: string) => void;
  onDismiss: () => void;
  maxProfiles: number;
}

export function FamilyProfilesScreen({
  profiles,
  activeProfile,
  onAddProfile,
  onSwitchProfile,
  onRemoveProfile,
  onDismiss,
  maxProfiles,
}: FamilyProfilesProps) {
  const colors = useColors();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("👤");

  const handleCreate = () => {
    if (newName.trim().length === 0) return;
    onAddProfile(newName.trim(), newEmoji);
    setNewName("");
    setNewEmoji("👤");
    setShowCreate(false);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(155,122,255,0.1)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={[styles.backBtnText, { color: colors.primary }]}>← Back</Text>
          </Pressable>
        </View>

        <Text style={styles.headerEmoji}>👨‍👩‍👧‍👦</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Family Profiles</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Each family member gets their own belief history, journal entries, and streak tracker.
          Switch profiles to keep everyone's journey separate and personal.
        </Text>

        {/* Current profile indicator */}
        {activeProfile && (
          <View style={[styles.activeCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
            <Text style={styles.activeEmoji}>{activeProfile.emoji}</Text>
            <View style={styles.activeInfo}>
              <Text style={[styles.activeName, { color: colors.foreground }]}>
                {activeProfile.name}
              </Text>
              <Text style={[styles.activeLabel, { color: colors.primary }]}>
                Currently Active
              </Text>
            </View>
            <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
          </View>
        )}

        {/* Profile list */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          All Profiles ({profiles.length}/{maxProfiles})
        </Text>

        {profiles.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>👤</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No profiles yet. Create your first profile to start tracking belief journeys separately for each family member.
            </Text>
          </View>
        )}

        {profiles.map((profile) => {
          const isActive = activeProfile?.id === profile.id;
          return (
            <View
              key={profile.id}
              style={[
                styles.profileCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isActive ? colors.primary + "60" : colors.border,
                },
              ]}
            >
              <Text style={styles.profileEmoji}>{profile.emoji}</Text>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>
                  {profile.name}
                </Text>
                <Text style={[styles.profileDate, { color: colors.muted }]}>
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.profileActions}>
                {!isActive && (
                  <Pressable
                    onPress={() => {
                      onSwitchProfile(profile.id);
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.switchBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.switchBtnText}>Switch</Text>
                  </Pressable>
                )}
                {isActive && (
                  <View style={[styles.activeTag, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.activeTagText, { color: colors.primary }]}>Active</Text>
                  </View>
                )}
                {profiles.length > 1 && (
                  <Pressable
                    onPress={() => {
                      onRemoveProfile(profile.id);
                      if (Platform.OS !== "web") {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.removeBtnText, { color: colors.error }]}>✕</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* Add profile button */}
        {profiles.length < maxProfiles && (
          <Pressable
            onPress={() => setShowCreate(true)}
            style={({ pressed }) => [
              styles.addBtn,
              {
                borderColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.addBtnText, { color: colors.primary }]}>
              + Add Family Member
            </Text>
          </Pressable>
        )}

        {/* How it works */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            How Family Profiles Work
          </Text>
          <Text style={[styles.infoText, { color: colors.muted }]}>
            Each profile has its own scan history, belief journal, and streak tracker. When you switch profiles, the app loads that person's data. This way, Mom's belief journey stays separate from the kids', and everyone can track their own growth over time.
          </Text>
          <Text style={[styles.infoText, { color: colors.muted, marginTop: 8 }]}>
            Profiles are stored locally on this device. Each family member can have their own private belief experience while sharing the same app.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create profile modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              New Family Member
            </Text>

            <Text style={[styles.modalLabel, { color: colors.muted }]}>Choose an avatar:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              <View style={styles.emojiRow}>
                {PROFILE_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setNewEmoji(e)}
                    style={({ pressed }) => [
                      styles.emojiOption,
                      {
                        backgroundColor: newEmoji === e ? colors.primary + "30" : colors.surface,
                        borderColor: newEmoji === e ? colors.primary : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.emojiOptionText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.modalLabel, { color: colors.muted, marginTop: 16 }]}>Name:</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Enter name..."
              placeholderTextColor={colors.muted}
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              style={[
                styles.nameInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewEmoji("👤");
                }}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                style={({ pressed }) => [
                  styles.modalCreateBtn,
                  {
                    backgroundColor: newName.trim() ? colors.primary : colors.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={styles.modalCreateText}>Create Profile</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  header: { flexDirection: "row", marginBottom: 16 },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 16, fontWeight: "600" },
  headerEmoji: { fontSize: 48, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 24, paddingHorizontal: 8 },
  activeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  activeEmoji: { fontSize: 36 },
  activeInfo: { flex: 1 },
  activeName: { fontSize: 18, fontWeight: "700" },
  activeLabel: { fontSize: 13, fontWeight: "600", marginTop: 2 },
  activeDot: { width: 12, height: 12, borderRadius: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  profileEmoji: { fontSize: 28 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: "600" },
  profileDate: { fontSize: 12, marginTop: 2 },
  profileActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  switchBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  switchBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  activeTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  activeTagText: { fontSize: 13, fontWeight: "600" },
  removeBtn: { padding: 6 },
  removeBtnText: { fontSize: 16, fontWeight: "700" },
  addBtn: {
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  addBtnText: { fontSize: 15, fontWeight: "700" },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  infoText: { fontSize: 13, lineHeight: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  emojiScroll: { marginBottom: 4 },
  emojiRow: { flexDirection: "row", gap: 8 },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiOptionText: { fontSize: 24 },
  nameInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    fontWeight: "500",
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalCreateBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCreateText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
