import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useOnboarding } from "@/hooks/use-onboarding";
import { useScanHistory, type ScanResult } from "@/hooks/use-scan-history";
import { useCustomBeliefs } from "@/hooks/use-custom-beliefs";
import { useBeliefStreak, getStreakMessage, getMilestoneLabel } from "@/hooks/use-belief-streak";
import { Onboarding } from "@/components/onboarding";
import { LiveScanner } from "@/components/live-scanner";
import { ResultsScreen } from "@/components/results-screen";
import { BedtimeMessage } from "@/components/bedtime-message";
import { CreateBeliefModal } from "@/components/create-belief-modal";
import { JournalEntryModal } from "@/components/journal-entry-modal";
import { BeliefMeditation } from "@/components/belief-meditation";
import { ScanReport } from "@/components/scan-report";
import { useAppSettings } from "@/app/(tabs)/settings";
import { useAchievements } from "@/hooks/use-achievements";
import {
  BELIEF_CATEGORIES,
  ALL_BELIEFS,
  type BeliefOption,
  type BeliefCategory,
} from "@/constants/beliefs";
import { getBeliefById } from "@/constants/beliefs";

type Screen =
  | "home"
  | "meditation"
  | "scanning"
  | "results"
  | "bedtime"
  | "create-belief"
  | "journal"
  | "report"
  ;

export default function DetectScreen() {
  const colors = useColors();
  const onboarding = useOnboarding();
  const { history, saveScan, updateJournal } = useScanHistory();
  const { customBeliefs, addBelief } = useCustomBeliefs();
  const { streak, scannedToday, newMilestones, recordScan, clearNewMilestones } = useBeliefStreak();
  const { settings } = useAppSettings();
  const achievements = useAchievements();

  const [screen, setScreen] = useState<Screen>("home");
  const [selectedBelief, setSelectedBelief] = useState<BeliefOption | null>(null);
  const [intensity, setIntensity] = useState(7);
  const [searchText, setSearchText] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("childhood");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

  // Combine built-in + custom beliefs for display
  const allCategories: BeliefCategory[] = useMemo(() => {
    const cats = [...BELIEF_CATEGORIES];
    if (customBeliefs.length > 0) {
      cats.push({
        id: "custom",
        name: "My Custom Beliefs",
        emoji: "🎨",
        beliefs: customBeliefs,
      });
    }
    return cats;
  }, [customBeliefs]);

  const allBeliefs = useMemo(
    () => [...ALL_BELIEFS, ...customBeliefs],
    [customBeliefs]
  );

  const handleSelectBelief = useCallback((belief: BeliefOption) => {
    setSelectedBelief(belief);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleStartScan = useCallback(() => {
    if (!selectedBelief) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (settings.meditationEnabled) {
      setScreen("meditation");
    } else {
      setScreen("scanning");
    }
  }, [selectedBelief, settings.meditationEnabled]);

  const handleScanComplete = useCallback(
    async (result: ScanResult) => {
      setLastResult(result);
      await saveScan(result);
      await recordScan(result.score, result.beliefName);
      // Check achievements after scan
      const totalScans = history.length + 1;
      const uniqueBeliefs = [...new Set([...history.map(h => h.beliefId), result.beliefId])];
      const uniqueCategories = [...new Set(uniqueBeliefs.map(id => {
        const b = getBeliefById(id);
        return b?.category || "custom";
      }))];
      achievements.checkAchievements({
        totalScans,
        currentStreak: streak.currentStreak,
        personalBest: Math.max(result.score, streak.personalBest),
        uniqueBeliefs,
        uniqueCategories,
        journalCount: history.filter(h => h.journalEntry).length,
        usedMeditation: settings.meditationEnabled,
      });
      setScreen("results");
    },
    [saveScan, recordScan, history, streak, achievements, settings.meditationEnabled]
  );

  const handleBedtime = useCallback(() => {
    setScreen("bedtime");
  }, []);

  const handleViewReport = useCallback(() => {
    setScreen("report");
  }, []);

  const handleJournal = useCallback(() => {
    setScreen("journal");
  }, []);

  const handleJournalSave = useCallback(
    async (entry: string) => {
      if (lastResult) {
        await updateJournal(lastResult.id, entry);
        setLastResult({ ...lastResult, journalEntry: entry });
      }
      setScreen("results");
    },
    [lastResult, updateJournal]
  );

  const handleCreateBelief = useCallback(
    (belief: BeliefOption) => {
      addBelief(belief);
      setSelectedBelief(belief);
      setExpandedCategory("custom");
      setScreen("home");
    },
    [addBelief]
  );


  // Onboarding
  if (onboarding.done === null) return null;
  if (!onboarding.done) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent>
        <Onboarding onComplete={onboarding.complete} />
      </Modal>
    );
  }

  // Create Belief
  if (screen === "create-belief") {
    return (
      <Modal visible animationType="slide" statusBarTranslucent>
        <CreateBeliefModal
          onSave={handleCreateBelief}
          onCancel={() => setScreen("home")}
        />
      </Modal>
    );
  }

  // Meditation
  if (screen === "meditation" && selectedBelief) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent>
        <BeliefMeditation
          belief={selectedBelief}
          onComplete={() => setScreen("scanning")}
          onSkip={() => setScreen("scanning")}
        />
      </Modal>
    );
  }

  // Live Scanner
  if (screen === "scanning" && selectedBelief) {
    return (
      <Modal visible animationType="slide" statusBarTranslucent>
        <LiveScanner
          belief={selectedBelief}
          intensity={intensity}
          scanDuration={settings.scanDuration}
          soundEnabled={settings.soundEnabled}
          storyEnabled={settings.storyNarrationEnabled}
          onComplete={handleScanComplete}
          onCancel={() => setScreen("home")}
        />
      </Modal>
    );
  }

  // Journal entry
  if (screen === "journal" && lastResult) {
    return (
      <Modal visible animationType="slide" statusBarTranslucent>
        <JournalEntryModal
          beliefName={lastResult.beliefName}
          beliefEmoji={lastResult.beliefEmoji}
          score={lastResult.score}
          existingEntry={lastResult.journalEntry}
          onSave={handleJournalSave}
          onSkip={() => setScreen("results")}
        />
      </Modal>
    );
  }

  // Report
  if (screen === "report" && lastResult) {
    return (
      <Modal visible animationType="slide" statusBarTranslucent>
        <ScanReport
          result={lastResult}
          onDismiss={() => setScreen("results")}
        />
      </Modal>
    );
  }

  // Results
  if (screen === "results" && lastResult) {
    return (
      <Modal visible animationType="slide" statusBarTranslucent>
        <ResultsScreen
          result={lastResult}
          onDismiss={() => setScreen("home")}
          onBedtime={handleBedtime}
          onJournal={handleJournal}
          onReport={handleViewReport}
        />
      </Modal>
    );
  }

  // Bedtime
  if (screen === "bedtime" && lastResult) {
    const belief = getBeliefById(lastResult.beliefId);
    const customBelief = customBeliefs.find((b) => b.id === lastResult.beliefId);
    const foundBelief = belief || customBelief;
    return (
      <Modal visible animationType="fade" statusBarTranslucent>
        <BedtimeMessage
          beliefName={lastResult.beliefName}
          beliefEmoji={lastResult.beliefEmoji}
          message={foundBelief?.bedtimeMessage || "Time for bed! The magic works while you sleep."}
          score={lastResult.score}
          onDismiss={() => setScreen("home")}
        />
      </Modal>
    );
  }


  // Filter beliefs by search
  const filteredBeliefs = searchText.trim()
    ? allBeliefs.filter(
        (b) =>
          b.name.toLowerCase().includes(searchText.toLowerCase()) ||
          b.category.toLowerCase().includes(searchText.toLowerCase())
      )
    : null;

  const intensityLabels = ["", "Curious", "Hopeful", "Interested", "Believing", "Focused", "Convinced", "Strong", "Powerful", "Absolute", "Unshakeable"];

  const renderCategory = ({ item: cat }: { item: BeliefCategory }) => {
    const isExpanded = expandedCategory === cat.id;
    return (
      <View style={styles.categorySection}>
        <Pressable
          onPress={() => setExpandedCategory(isExpanded ? null : cat.id)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.categoryHeader}>
            <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
              {cat.emoji} {cat.name}
            </Text>
            <View style={styles.categoryRight}>
              <Text style={[styles.categoryCount, { color: colors.muted }]}>
                {cat.beliefs.length}
              </Text>
              <Text style={[styles.expandIcon, { color: colors.muted }]}>
                {isExpanded ? "▲" : "▼"}
              </Text>
            </View>
          </View>
        </Pressable>
        {isExpanded && (
          <View style={styles.beliefGrid}>
            {cat.beliefs.map((belief) => (
              <Pressable
                key={belief.id}
                onPress={() => handleSelectBelief(belief)}
                style={({ pressed }) => [
                  styles.beliefChip,
                  {
                    backgroundColor:
                      selectedBelief?.id === belief.id ? colors.primary + "30" : colors.surface,
                    borderColor:
                      selectedBelief?.id === belief.id ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={styles.beliefEmoji}>{belief.emoji}</Text>
                <Text
                  style={[
                    styles.beliefChipName,
                    {
                      color:
                        selectedBelief?.id === belief.id ? colors.primary : colors.foreground,
                    },
                  ]}
                >
                  {belief.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  };

  const ListHeader = (
    <View>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>
          Belief Field{"\n"}Detector
        </Text>
        <Text style={[styles.heroSub, { color: colors.muted }]}>
          Choose what you believe in, focus your mind, and watch your phone's sensors respond
        </Text>
      </View>

      {/* Belief Streak */}
      {streak.totalScans > 0 && (
        <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: colors.primary + "40" }]}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Text style={[styles.streakNumber, { color: colors.primary }]}>
                {streak.currentStreak}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.muted }]}>Day Streak</Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakItem}>
              <Text style={[styles.streakNumber, { color: colors.primary }]}>
                {streak.personalBest}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.muted }]}>Best Score</Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakItem}>
              <Text style={[styles.streakNumber, { color: colors.primary }]}>
                {streak.totalScans}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.muted }]}>Total Scans</Text>
            </View>
          </View>
          <Text style={[styles.streakMessage, { color: colors.foreground }]}>
            {getStreakMessage(streak.currentStreak)}
          </Text>
          {scannedToday && (
            <Text style={[styles.scannedToday, { color: colors.success }]}>
              ✅ You've scanned today!
            </Text>
          )}
          {streak.milestones.length > 0 && (
            <View style={styles.milestoneRow}>
              {streak.milestones.slice(-5).map((m) => {
                const { emoji, label } = getMilestoneLabel(m);
                return (
                  <View key={m} style={[styles.milestoneBadge, { backgroundColor: colors.primary + "15" }]}>
                    <Text style={styles.milestoneEmoji}>{emoji}</Text>
                    <Text style={[styles.milestoneText, { color: colors.primary }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* New milestone notification */}
      {newMilestones.length > 0 && (
        <Pressable
          onPress={clearNewMilestones}
          style={({ pressed }) => [
            styles.milestoneNotif,
            { backgroundColor: colors.success + "15", borderColor: colors.success + "50", opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.milestoneNotifText, { color: colors.success }]}>
            🎉 New milestone{newMilestones.length > 1 ? "s" : ""} earned!
            {newMilestones.map((m) => " " + getMilestoneLabel(m).emoji).join("")}
          </Text>
          <Text style={[styles.milestoneNotifSub, { color: colors.muted }]}>Tap to dismiss</Text>
        </Pressable>
      )}

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search beliefs..."
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.foreground }]}
          returnKeyType="done"
        />
      </View>

      {/* Action buttons row */}
      <View style={styles.actionRow}>
        {/* Create custom belief */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setScreen("create-belief");
          }}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.primary + "12",
              borderColor: colors.primary + "40",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={styles.actionBtnIcon}>🎨</Text>
          <Text style={[styles.actionBtnTitle, { color: colors.primary }]}>Create Belief</Text>
          <Text style={[styles.actionBtnSub, { color: colors.muted }]}>Make your own</Text>
        </Pressable>


      </View>

      {/* Search results */}
      {filteredBeliefs && (
        <View style={styles.searchResults}>
          <Text style={[styles.searchResultsLabel, { color: colors.muted }]}>
            {filteredBeliefs.length} results
          </Text>
          <View style={styles.beliefGrid}>
            {filteredBeliefs.map((belief) => (
              <Pressable
                key={belief.id}
                onPress={() => {
                  handleSelectBelief(belief);
                  setSearchText("");
                }}
                style={({ pressed }) => [
                  styles.beliefChip,
                  {
                    backgroundColor:
                      selectedBelief?.id === belief.id ? colors.primary + "30" : colors.surface,
                    borderColor:
                      selectedBelief?.id === belief.id ? colors.primary : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={styles.beliefEmoji}>{belief.emoji}</Text>
                <Text
                  style={[
                    styles.beliefChipName,
                    {
                      color: selectedBelief?.id === belief.id ? colors.primary : colors.foreground,
                    },
                  ]}
                >
                  {belief.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!filteredBeliefs && (
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>
          CHOOSE YOUR BELIEF
        </Text>
      )}
    </View>
  );

  // Count journal entries
  const journalCount = history.filter((h) => h.journalEntry).length;

  const ListFooter = (
    <View>
      {/* Selected belief detail */}
      {selectedBelief && (
        <View style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.primary + "60" }]}>
          <Text style={styles.selectedEmoji}>{selectedBelief.emoji}</Text>
          <Text style={[styles.selectedName, { color: colors.foreground }]}>
            {selectedBelief.name}
          </Text>
          <Text style={[styles.selectedDesc, { color: colors.muted }]}>
            {selectedBelief.description}
          </Text>

          {/* Intensity slider */}
          <View style={styles.intensitySection}>
            <Text style={[styles.intensityLabel, { color: colors.foreground }]}>
              Belief Intensity: {intensity}/10
            </Text>
            <Text style={[styles.intensityWord, { color: colors.primary }]}>
              {intensityLabels[intensity]}
            </Text>
            <View style={styles.intensityRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => {
                    setIntensity(n);
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync();
                    }
                  }}
                  style={({ pressed }) => [
                    styles.intensityDot,
                    {
                      backgroundColor: n <= intensity ? colors.primary : colors.border,
                      transform: [{ scale: n === intensity ? 1.3 : pressed ? 0.9 : 1 }],
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Begin Scan */}
          <Pressable
            onPress={handleStartScan}
            style={({ pressed }) => [
              styles.scanBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Text style={styles.scanBtnText}>Begin Scan</Text>
            <Text style={styles.scanBtnSub}>{settings.scanDuration}-second belief field detection{settings.soundEnabled ? ' with audio' : ''}</Text>
          </Pressable>


        </View>
      )}

      {/* Journal preview */}
      {journalCount > 0 && (
        <View style={styles.journalPreview}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>BELIEF JOURNAL</Text>
          {history
            .filter((h) => h.journalEntry)
            .slice(0, 2)
            .map((scan) => (
              <View
                key={scan.id}
                style={[styles.journalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.journalCardHeader}>
                  <Text style={styles.journalCardEmoji}>{scan.beliefEmoji}</Text>
                  <View style={styles.journalCardInfo}>
                    <Text style={[styles.journalCardName, { color: colors.foreground }]}>
                      {scan.beliefName}
                    </Text>
                    <Text style={[styles.journalCardDate, { color: colors.muted }]}>
                      {new Date(scan.date).toLocaleDateString()} · Score: {scan.score}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.journalCardText, { color: colors.muted }]} numberOfLines={2}>
                  "{scan.journalEntry}"
                </Text>
              </View>
            ))}
        </View>
      )}

      {/* Recent scans */}
      {history.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>RECENT SCANS</Text>
          {history.slice(0, 3).map((scan) => (
            <View
              key={scan.id}
              style={[styles.recentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={styles.recentEmoji}>{scan.beliefEmoji}</Text>
              <View style={styles.recentInfo}>
                <Text style={[styles.recentName, { color: colors.foreground }]}>{scan.beliefName}</Text>
                <Text style={[styles.recentDate, { color: colors.muted }]}>
                  {new Date(scan.date).toLocaleDateString()}
                  {scan.journalEntry ? " · 📔" : ""}
                </Text>
              </View>
              <View style={[styles.recentScore, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.recentScoreText, { color: colors.primary }]}>{scan.score}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </View>
  );

  return (
    <ScreenContainer>
      <LinearGradient
        colors={["rgba(155,122,255,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      <FlatList
        data={filteredBeliefs ? [] : allCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  hero: { alignItems: "center", paddingTop: 12, paddingBottom: 20 },
  heroTitle: { fontSize: 32, fontWeight: "900", textAlign: "center", lineHeight: 38 },
  heroSub: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20, paddingHorizontal: 20 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
    height: 48,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, height: 48 },
  actionRow: { marginBottom: 16 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
  },
  actionBtnIcon: { fontSize: 24, marginBottom: 4 },
  actionBtnTitle: { fontSize: 14, fontWeight: "700" },
  actionBtnSub: { fontSize: 11, marginTop: 2 },
  searchResults: { marginBottom: 16 },
  searchResultsLabel: { fontSize: 12, fontWeight: "500", marginBottom: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  categorySection: { marginBottom: 8 },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  categoryTitle: { fontSize: 17, fontWeight: "700" },
  categoryRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryCount: { fontSize: 13, fontWeight: "600" },
  expandIcon: { fontSize: 12 },
  beliefGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  beliefChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  beliefEmoji: { fontSize: 18 },
  beliefChipName: { fontSize: 14, fontWeight: "600" },
  selectedCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    marginTop: 16,
  },
  selectedEmoji: { fontSize: 56, marginBottom: 8 },
  selectedName: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  selectedDesc: { fontSize: 14, textAlign: "center", marginBottom: 20 },
  intensitySection: { width: "100%", alignItems: "center", marginBottom: 20 },
  intensityLabel: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  intensityWord: { fontSize: 13, fontWeight: "700", marginBottom: 12 },
  intensityRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  intensityDot: { width: 24, height: 24, borderRadius: 12 },
  scanBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  scanBtnText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  scanBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  journalPreview: { marginTop: 24 },
  journalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  journalCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  journalCardEmoji: { fontSize: 28 },
  journalCardInfo: { flex: 1 },
  journalCardName: { fontSize: 15, fontWeight: "600" },
  journalCardDate: { fontSize: 12, marginTop: 2 },
  journalCardText: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  recentSection: { marginTop: 24 },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  recentEmoji: { fontSize: 28 },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 15, fontWeight: "600" },
  recentDate: { fontSize: 12, marginTop: 2 },
  recentScore: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  recentScoreText: { fontSize: 18, fontWeight: "800" },
  streakCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  streakItem: { alignItems: "center", flex: 1 },
  streakNumber: { fontSize: 28, fontWeight: "900" },
  streakLabel: { fontSize: 11, fontWeight: "600", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  streakDivider: { width: 1, height: 36 },
  streakMessage: { fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: 4 },
  scannedToday: { fontSize: 12, fontWeight: "600", textAlign: "center", marginTop: 6 },
  milestoneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  milestoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  milestoneEmoji: { fontSize: 14 },
  milestoneText: { fontSize: 11, fontWeight: "600" },
  milestoneNotif: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  milestoneNotifText: { fontSize: 14, fontWeight: "700" },
  milestoneNotifSub: { fontSize: 11, marginTop: 4 },
});
