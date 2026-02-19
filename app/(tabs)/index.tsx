import { useState, useCallback } from "react";
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
import { Onboarding } from "@/components/onboarding";
import { LiveScanner } from "@/components/live-scanner";
import { ResultsScreen } from "@/components/results-screen";
import { BedtimeMessage } from "@/components/bedtime-message";
import { BELIEF_CATEGORIES, ALL_BELIEFS, type BeliefOption } from "@/constants/beliefs";
import { getBeliefById } from "@/constants/beliefs";

type Screen = "home" | "scanning" | "results" | "bedtime";

export default function DetectScreen() {
  const colors = useColors();
  const onboarding = useOnboarding();
  const { history, saveScan } = useScanHistory();

  const [screen, setScreen] = useState<Screen>("home");
  const [selectedBelief, setSelectedBelief] = useState<BeliefOption | null>(null);
  const [intensity, setIntensity] = useState(7);
  const [searchText, setSearchText] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("childhood");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);

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
    setScreen("scanning");
  }, [selectedBelief]);

  const handleScanComplete = useCallback(
    async (result: ScanResult) => {
      setLastResult(result);
      await saveScan(result);
      setScreen("results");
    },
    [saveScan]
  );

  const handleBedtime = useCallback(() => {
    setScreen("bedtime");
  }, []);

  // Onboarding
  if (onboarding.done === null) return null;
  if (!onboarding.done) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent>
        <Onboarding onComplete={onboarding.complete} />
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
          onComplete={handleScanComplete}
          onCancel={() => setScreen("home")}
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
        />
      </Modal>
    );
  }

  // Bedtime
  if (screen === "bedtime" && lastResult) {
    const belief = getBeliefById(lastResult.beliefId);
    return (
      <Modal visible animationType="fade" statusBarTranslucent>
        <BedtimeMessage
          beliefName={lastResult.beliefName}
          beliefEmoji={lastResult.beliefEmoji}
          message={belief?.bedtimeMessage || "Time for bed! The magic works while you sleep."}
          score={lastResult.score}
          onDismiss={() => setScreen("home")}
        />
      </Modal>
    );
  }

  // Filter beliefs by search
  const filteredBeliefs = searchText.trim()
    ? ALL_BELIEFS.filter(
        (b) =>
          b.name.toLowerCase().includes(searchText.toLowerCase()) ||
          b.category.toLowerCase().includes(searchText.toLowerCase())
      )
    : null;

  const intensityLabels = ["", "Curious", "Hopeful", "Interested", "Believing", "Focused", "Convinced", "Strong", "Powerful", "Absolute", "Unshakeable"];

  const renderCategory = ({ item: cat }: { item: (typeof BELIEF_CATEGORIES)[0] }) => {
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
            <Text style={[styles.expandIcon, { color: colors.muted }]}>
              {isExpanded ? "▲" : "▼"}
            </Text>
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
            <Text style={styles.scanBtnSub}>60-second belief field detection</Text>
          </Pressable>
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
        data={filteredBeliefs ? [] : BELIEF_CATEGORIES}
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
    marginBottom: 16,
    height: 48,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, height: 48 },
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
});
