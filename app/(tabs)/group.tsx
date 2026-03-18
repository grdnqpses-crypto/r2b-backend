/**
 * Group Beliefs Tab — Synchronized group belief sessions.
 *
 * Lets multiple people scan the same belief simultaneously and see
 * a combined "group field" score. Uses a shared session code so
 * participants can join the same session.
 *
 * Since this is a local app (no backend sync), the group session
 * works by having each person scan the same belief at the same time,
 * then manually entering their scores to compute a group average.
 * The UI guides the group through a synchronized countdown.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Share,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "@/lib/safe-imports";
import { Haptics } from "@/lib/safe-imports";
import { ALL_BELIEFS, type BeliefOption } from "@/constants/beliefs";
import { useScanHistoryContext } from "@/lib/scan-history-provider";
import type { ScanResult } from "@/hooks/use-scan-history";

// ─── Types ───────────────────────────────────────────────────────

interface GroupParticipant {
  id: string;
  name: string;
  score: number | null;
  emoji: string;
}

type GroupPhase =
  | "setup"       // Choose belief, add participants
  | "countdown"   // 5-4-3-2-1 synchronized start
  | "scanning"    // Everyone scans simultaneously
  | "collecting"  // Enter each person's score
  | "results";    // Show group field result

const PARTICIPANT_EMOJIS = ["🧑", "👩", "👦", "👧", "🧓", "👴", "👵", "🧒"];

function generateSessionCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getGroupFieldLabel(avgScore: number): { label: string; desc: string; color: string } {
  if (avgScore >= 80) return {
    label: "TRANSCENDENT FIELD",
    desc: "Your group's combined belief created an extraordinary field. The collective conviction is off the charts!",
    color: "#FFD700",
  };
  if (avgScore >= 60) return {
    label: "POWERFUL FIELD",
    desc: "A strong group belief field was detected. Multiple minds believing together amplified the signal significantly.",
    color: "#9B7AFF",
  };
  if (avgScore >= 40) return {
    label: "RESONANT FIELD",
    desc: "Your group's belief resonated together. The combined field shows a clear, measurable pattern.",
    color: "#4CAF50",
  };
  if (avgScore >= 20) return {
    label: "EMERGING FIELD",
    desc: "A group belief field is forming. With more focus and practice, your collective signal will grow stronger.",
    color: "#2196F3",
  };
  return {
    label: "NASCENT FIELD",
    desc: "The group field is just beginning to form. Encourage everyone to focus more deeply on the shared belief.",
    color: "#9E9E9E",
  };
}

// ─── Component ───────────────────────────────────────────────────

export default function GroupScreen() {
  const colors = useColors();
  const { saveScan } = useScanHistoryContext();

  const [phase, setPhase] = useState<GroupPhase>("setup");
  const [selectedBelief, setSelectedBelief] = useState<BeliefOption | null>(null);
  const [participants, setParticipants] = useState<GroupParticipant[]>([
    { id: "1", name: "You", score: null, emoji: "🧑" },
  ]);
  const [newName, setNewName] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [scanElapsed, setScanElapsed] = useState(0);
  const [scanDuration] = useState(60);
  const [sessionCode] = useState(generateSessionCode);
  const [beliefSearch, setBeliefSearch] = useState("");
  const [showBeliefPicker, setShowBeliefPicker] = useState(false);
  const [collectingIdx, setCollectingIdx] = useState(0);
  const [scoreInput, setScoreInput] = useState("");
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("scanning");
      setScanElapsed(0);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Scan timer
  useEffect(() => {
    if (phase !== "scanning") return;
    scanTimerRef.current = setInterval(() => {
      setScanElapsed((e) => {
        if (e + 1 >= scanDuration) {
          clearInterval(scanTimerRef.current!);
          setPhase("collecting");
          setCollectingIdx(0);
          return scanDuration;
        }
        return e + 1;
      });
    }, 1000);
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [phase, scanDuration]);

  const handleAddParticipant = useCallback(() => {
    if (!newName.trim()) return;
    const emoji = PARTICIPANT_EMOJIS[participants.length % PARTICIPANT_EMOJIS.length];
    setParticipants((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newName.trim(), score: null, emoji },
    ]);
    setNewName("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [newName, participants.length]);

  const handleRemoveParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleStartSession = useCallback(() => {
    if (!selectedBelief) {
      Alert.alert("Choose a Belief", "Please select a belief for your group session.");
      return;
    }
    if (participants.length < 1) {
      Alert.alert("Add Participants", "Add at least one participant to start a group session.");
      return;
    }
    setPhase("countdown");
    setCountdown(5);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [selectedBelief, participants]);

  const handleSubmitScore = useCallback(() => {
    const score = parseInt(scoreInput, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      Alert.alert("Invalid Score", "Please enter a score between 0 and 100.");
      return;
    }
    const updated = participants.map((p, i) =>
      i === collectingIdx ? { ...p, score } : p
    );
    setParticipants(updated);
    setScoreInput("");
    if (collectingIdx + 1 >= participants.length) {
      setPhase("results");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setCollectingIdx((i) => i + 1);
    }
  }, [scoreInput, collectingIdx, participants]);

  const handleSaveGroupScan = useCallback(async () => {
    if (!selectedBelief) return;
    const scores = participants.map((p) => p.score ?? 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const result: ScanResult = {
      id: Date.now().toString(),
      beliefId: selectedBelief.id,
      beliefName: `[Group] ${selectedBelief.name}`,
      beliefEmoji: selectedBelief.emoji,
      intensity: 10,
      score: avgScore,
      date: new Date().toISOString(),
      sensorBreakdown: [],
      summary: `Group session with ${participants.length} participants. Combined belief field score: ${avgScore}/100.`,
    };
    await saveScan(result);
    Alert.alert("Saved!", "Your group session has been saved to History.");
  }, [selectedBelief, participants, saveScan]);

  const handleShareSession = useCallback(async () => {
    if (!selectedBelief) return;
    const scores = participants.map((p) => p.score ?? 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const text = `🌟 Group Belief Field Session\n\nBelief: ${selectedBelief.emoji} ${selectedBelief.name}\nParticipants: ${participants.length}\nGroup Score: ${avgScore}/100\n\n${participants.map((p) => `${p.emoji} ${p.name}: ${p.score ?? "?"}`).join("\n")}\n\nMeasured with Belief Field Detector`;
    try {
      await Share.share({ message: text });
    } catch {}
  }, [selectedBelief, participants]);

  const handleReset = useCallback(() => {
    setPhase("setup");
    setSelectedBelief(null);
    setParticipants([{ id: "1", name: "You", score: null, emoji: "🧑" }]);
    setCountdown(5);
    setScanElapsed(0);
    setCollectingIdx(0);
    setScoreInput("");
  }, []);

  const filteredBeliefs = beliefSearch.trim()
    ? ALL_BELIEFS.filter((b) =>
        b.name.toLowerCase().includes(beliefSearch.toLowerCase())
      ).slice(0, 20)
    : ALL_BELIEFS.slice(0, 20);

  // ─── Countdown Phase ──────────────────────────────────────────
  if (phase === "countdown") {
    return (
      <View style={[styles.fullScreen, { backgroundColor: "#0A0A1A" }]}>
        <LinearGradient
          colors={["rgba(155,122,255,0.2)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
        />
        <View style={styles.centeredContent}>
          <Text style={[styles.countdownLabel, { color: "rgba(155,122,255,0.8)" }]}>
            Group session starting in
          </Text>
          <Text style={[styles.countdownEmoji]}>{selectedBelief?.emoji ?? "✨"}</Text>
          <Text style={[styles.countdownBelief, { color: "#fff" }]}>
            {selectedBelief?.name}
          </Text>
          <Text style={[styles.countdownNumber, { color: "#9B7AFF" }]}>
            {countdown === 0 ? "GO!" : countdown}
          </Text>
          <Text style={[styles.countdownHint, { color: "rgba(255,255,255,0.5)" }]}>
            Everyone focus on your belief...
          </Text>
          <View style={styles.participantPills}>
            {participants.map((p) => (
              <View key={p.id} style={styles.participantPill}>
                <Text style={styles.participantPillEmoji}>{p.emoji}</Text>
                <Text style={[styles.participantPillName, { color: "#fff" }]}>{p.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ─── Scanning Phase ───────────────────────────────────────────
  if (phase === "scanning") {
    const remaining = scanDuration - scanElapsed;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const progress = scanElapsed / scanDuration;

    return (
      <View style={[styles.fullScreen, { backgroundColor: "#0A0A1A" }]}>
        <LinearGradient
          colors={["rgba(155,122,255,0.15)", "rgba(0,100,255,0.05)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.centeredContent}>
          <Text style={[styles.scanningLabel, { color: "rgba(155,122,255,0.8)" }]}>
            SCANNING GROUP BELIEF FIELD
          </Text>
          <Text style={styles.countdownEmoji}>{selectedBelief?.emoji ?? "✨"}</Text>
          <Text style={[styles.countdownBelief, { color: "#fff" }]}>
            {selectedBelief?.name}
          </Text>

          {/* Timer */}
          <Text style={[styles.scanTimer, { color: "#9B7AFF" }]}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </Text>
          <Text style={[styles.scanTimerLabel, { color: "rgba(255,255,255,0.4)" }]}>
            remaining
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%`, backgroundColor: "#9B7AFF" },
              ]}
            />
          </View>

          <Text style={[styles.scanHint, { color: "rgba(255,255,255,0.6)" }]}>
            Everyone: close your eyes, breathe deeply,{"\n"}and focus your belief as hard as you can
          </Text>

          <View style={styles.participantPills}>
            {participants.map((p) => (
              <View key={p.id} style={[styles.participantPill, { backgroundColor: "rgba(155,122,255,0.2)" }]}>
                <Text style={styles.participantPillEmoji}>{p.emoji}</Text>
                <Text style={[styles.participantPillName, { color: "#fff" }]}>{p.name}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => {
              if (scanTimerRef.current) clearInterval(scanTimerRef.current);
              setPhase("collecting");
              setCollectingIdx(0);
            }}
            style={({ pressed }) => [styles.endScanBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.endScanBtnText}>End Scan Early</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Collecting Scores Phase ──────────────────────────────────
  if (phase === "collecting") {
    const current = participants[collectingIdx];
    return (
      <View style={[styles.fullScreen, { backgroundColor: "#0A0A1A" }]}>
        <LinearGradient
          colors={["rgba(155,122,255,0.12)", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
        />
        <View style={styles.centeredContent}>
          <Text style={[styles.collectingLabel, { color: "rgba(155,122,255,0.8)" }]}>
            ENTER SCAN SCORES
          </Text>
          <Text style={[styles.collectingProgress, { color: "rgba(255,255,255,0.4)" }]}>
            {collectingIdx + 1} of {participants.length}
          </Text>
          <Text style={styles.collectingEmoji}>{current?.emoji}</Text>
          <Text style={[styles.collectingName, { color: "#fff" }]}>{current?.name}</Text>
          <Text style={[styles.collectingHint, { color: "rgba(255,255,255,0.5)" }]}>
            Open the Detect tab, run a scan for{"\n"}
            <Text style={{ color: "#9B7AFF", fontWeight: "700" }}>
              {selectedBelief?.emoji} {selectedBelief?.name}
            </Text>
            {"\n"}then enter the score below
          </Text>
          <TextInput
            value={scoreInput}
            onChangeText={setScoreInput}
            placeholder="0–100"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="number-pad"
            maxLength={3}
            style={styles.scoreInput}
            returnKeyType="done"
            onSubmitEditing={handleSubmitScore}
          />
          <Pressable
            onPress={handleSubmitScore}
            style={({ pressed }) => [
              styles.submitScoreBtn,
              { backgroundColor: "#9B7AFF", opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={styles.submitScoreBtnText}>
              {collectingIdx + 1 >= participants.length ? "See Results" : "Next →"}
            </Text>
          </Pressable>

          {/* Already entered scores */}
          {collectingIdx > 0 && (
            <View style={styles.enteredScores}>
              {participants.slice(0, collectingIdx).map((p) => (
                <View key={p.id} style={styles.enteredScoreRow}>
                  <Text style={styles.enteredScoreEmoji}>{p.emoji}</Text>
                  <Text style={[styles.enteredScoreName, { color: "rgba(255,255,255,0.7)" }]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.enteredScoreValue, { color: "#9B7AFF" }]}>
                    {p.score}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // ─── Results Phase ────────────────────────────────────────────
  if (phase === "results") {
    const scores = participants.map((p) => p.score ?? 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const { label, desc, color } = getGroupFieldLabel(avgScore);
    const topParticipant = participants.find((p) => p.score === maxScore);

    return (
      <View style={[styles.fullScreen, { backgroundColor: "#0A0A1A" }]}>
        <LinearGradient
          colors={[color + "20", "transparent"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
        />
        <ScrollView contentContainerStyle={styles.resultsContent}>
          <Text style={[styles.resultsTitle, { color }]}>GROUP FIELD RESULT</Text>
          <Text style={styles.resultsEmoji}>{selectedBelief?.emoji}</Text>
          <Text style={[styles.resultsBelief, { color: "#fff" }]}>{selectedBelief?.name}</Text>

          {/* Group score */}
          <View style={[styles.groupScoreCard, { borderColor: color + "50", backgroundColor: color + "10" }]}>
            <Text style={[styles.groupScoreLabel, { color }]}>COMBINED FIELD SCORE</Text>
            <Text style={[styles.groupScoreValue, { color }]}>{avgScore}</Text>
            <Text style={[styles.groupScoreMax, { color: "rgba(255,255,255,0.4)" }]}>/100</Text>
            <Text style={[styles.groupScoreFieldLabel, { color }]}>{label}</Text>
          </View>

          <Text style={[styles.groupScoreDesc, { color: "rgba(255,255,255,0.6)" }]}>{desc}</Text>

          {/* Individual scores */}
          <View style={styles.individualScores}>
            <Text style={[styles.individualTitle, { color: "rgba(255,255,255,0.4)" }]}>
              INDIVIDUAL SCORES
            </Text>
            {participants
              .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
              .map((p) => {
                const isTop = p.id === topParticipant?.id;
                return (
                  <View key={p.id} style={[styles.individualRow, { borderColor: isTop ? color + "50" : "rgba(255,255,255,0.1)" }]}>
                    <Text style={styles.individualEmoji}>{p.emoji}</Text>
                    <Text style={[styles.individualName, { color: "#fff" }]}>{p.name}</Text>
                    {isTop && <Text style={styles.topBadge}>⭐ Strongest</Text>}
                    <View style={[styles.individualScoreBar, { flex: 1, marginHorizontal: 8 }]}>
                      <View
                        style={[
                          styles.individualScoreBarFill,
                          { width: `${p.score ?? 0}%`, backgroundColor: isTop ? color : "#9B7AFF" + "80" },
                        ]}
                      />
                    </View>
                    <Text style={[styles.individualScore, { color: isTop ? color : "#9B7AFF" }]}>
                      {p.score ?? 0}
                    </Text>
                  </View>
                );
              })}
          </View>

          {/* Amplification bonus */}
          {participants.length > 1 && (
            <View style={[styles.amplificationBox, { borderColor: "rgba(155,122,255,0.3)", backgroundColor: "rgba(155,122,255,0.08)" }]}>
              <Text style={styles.amplificationEmoji}>🔮</Text>
              <Text style={[styles.amplificationText, { color: "rgba(255,255,255,0.7)" }]}>
                <Text style={{ color: "#9B7AFF", fontWeight: "700" }}>
                  {participants.length} minds believing together
                </Text>
                {" "}creates a resonance effect. Research shows collective belief amplifies individual conviction by up to {Math.round(participants.length * 15)}%.
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.resultActions}>
            <Pressable
              onPress={handleSaveGroupScan}
              style={({ pressed }) => [
                styles.resultBtn,
                { backgroundColor: "#9B7AFF", opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={styles.resultBtnText}>💾 Save to History</Text>
            </Pressable>
            <Pressable
              onPress={handleShareSession}
              style={({ pressed }) => [
                styles.resultBtn,
                { backgroundColor: "rgba(155,122,255,0.2)", borderWidth: 1, borderColor: "#9B7AFF50", opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={[styles.resultBtnText, { color: "#9B7AFF" }]}>📤 Share Results</Text>
            </Pressable>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                styles.resultBtn,
                { backgroundColor: "rgba(255,255,255,0.05)", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.resultBtnText, { color: "rgba(255,255,255,0.5)" }]}>
                New Session
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Setup Phase ──────────────────────────────────────────────
  return (
    <ScreenContainer>
      <LinearGradient
        colors={["rgba(155,122,255,0.08)", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      <ScrollView contentContainerStyle={styles.setupContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.setupHeader}>
          <Text style={[styles.setupTitle, { color: colors.foreground }]}>Group Beliefs</Text>
          <Text style={[styles.setupSubtitle, { color: colors.muted }]}>
            Scan the same belief together and combine your fields
          </Text>
        </View>

        {/* Session code */}
        <View style={[styles.sessionCodeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sessionCodeLabel, { color: colors.muted }]}>SESSION CODE</Text>
          <Text style={[styles.sessionCode, { color: colors.primary }]}>{sessionCode}</Text>
          <Text style={[styles.sessionCodeHint, { color: colors.muted }]}>
            Share this code so everyone knows which session to join
          </Text>
        </View>

        {/* Choose belief */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>SHARED BELIEF</Text>
          <Pressable
            onPress={() => setShowBeliefPicker(!showBeliefPicker)}
            style={({ pressed }) => [
              styles.beliefPickerBtn,
              {
                backgroundColor: colors.surface,
                borderColor: selectedBelief ? colors.primary + "60" : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {selectedBelief ? (
              <View style={styles.beliefPickerSelected}>
                <Text style={styles.beliefPickerEmoji}>{selectedBelief.emoji}</Text>
                <Text style={[styles.beliefPickerName, { color: colors.foreground }]}>
                  {selectedBelief.name}
                </Text>
                <Text style={[styles.beliefPickerChange, { color: colors.primary }]}>Change</Text>
              </View>
            ) : (
              <Text style={[styles.beliefPickerPlaceholder, { color: colors.muted }]}>
                Tap to choose a belief for your group...
              </Text>
            )}
          </Pressable>

          {showBeliefPicker && (
            <View style={[styles.beliefPickerDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={beliefSearch}
                onChangeText={setBeliefSearch}
                placeholder="Search beliefs..."
                placeholderTextColor={colors.muted}
                style={[styles.beliefSearchInput, { color: colors.foreground, borderColor: colors.border }]}
              />
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {filteredBeliefs.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => {
                      setSelectedBelief(b);
                      setShowBeliefPicker(false);
                      setBeliefSearch("");
                    }}
                    style={({ pressed }) => [
                      styles.beliefPickerItem,
                      { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={styles.beliefPickerItemEmoji}>{b.emoji}</Text>
                    <Text style={[styles.beliefPickerItemName, { color: colors.foreground }]}>
                      {b.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Participants */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>
            PARTICIPANTS ({participants.length})
          </Text>
          {participants.map((p, i) => (
            <View
              key={p.id}
              style={[styles.participantRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={styles.participantRowEmoji}>{p.emoji}</Text>
              <Text style={[styles.participantRowName, { color: colors.foreground }]}>{p.name}</Text>
              {i > 0 && (
                <Pressable
                  onPress={() => handleRemoveParticipant(p.id)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.removeBtn, { color: colors.error }]}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}

          {/* Add participant */}
          <View style={[styles.addParticipantRow, { borderColor: colors.border }]}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Add participant name..."
              placeholderTextColor={colors.muted}
              style={[styles.addParticipantInput, { color: colors.foreground }]}
              returnKeyType="done"
              onSubmitEditing={handleAddParticipant}
            />
            <Pressable
              onPress={handleAddParticipant}
              style={({ pressed }) => [
                styles.addParticipantBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.addParticipantBtnText}>Add</Text>
            </Pressable>
          </View>
        </View>

        {/* How it works */}
        <View style={[styles.howItWorks, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.howItWorksTitle, { color: colors.foreground }]}>
            🔮 How Group Sessions Work
          </Text>
          <Text style={[styles.howItWorksText, { color: colors.muted }]}>
            1. Everyone opens the Detect tab on their own phone{"\n"}
            2. This screen counts down from 5 — everyone starts scanning at the same moment{"\n"}
            3. All scan the same belief for 60 seconds{"\n"}
            4. Enter each person's score here{"\n"}
            5. See your combined group belief field!
          </Text>
          <Text style={[styles.howItWorksScience, { color: colors.primary }]}>
            Research shows collective belief creates a resonance effect — multiple minds focusing on the same thing amplify each other's conviction.
          </Text>
        </View>

        {/* Start button */}
        <Pressable
          onPress={handleStartSession}
          style={({ pressed }) => [
            styles.startBtn,
            {
              backgroundColor: selectedBelief ? colors.primary : colors.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Text style={[styles.startBtnText, { color: selectedBelief ? "#fff" : colors.muted }]}>
            {selectedBelief
              ? `Start Group Session — ${participants.length} participant${participants.length !== 1 ? "s" : ""}`
              : "Choose a belief to start"}
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    gap: 12,
  },
  countdownLabel: { fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  countdownEmoji: { fontSize: 72 },
  countdownBelief: { fontSize: 26, fontWeight: "800", textAlign: "center" },
  countdownNumber: { fontSize: 100, fontWeight: "900" },
  countdownHint: { fontSize: 15, fontStyle: "italic", textAlign: "center" },
  participantPills: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 },
  participantPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(155,122,255,0.15)",
  },
  participantPillEmoji: { fontSize: 16 },
  participantPillName: { fontSize: 13, fontWeight: "600" },
  scanningLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5 },
  scanTimer: { fontSize: 64, fontWeight: "900" },
  scanTimerLabel: { fontSize: 12, marginTop: -8 },
  progressBarContainer: {
    width: "80%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  scanHint: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  endScanBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  endScanBtnText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "600" },
  collectingLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5 },
  collectingProgress: { fontSize: 14 },
  collectingEmoji: { fontSize: 64 },
  collectingName: { fontSize: 24, fontWeight: "800" },
  collectingHint: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  scoreInput: {
    width: 140,
    height: 70,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#9B7AFF",
    textAlign: "center",
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    backgroundColor: "rgba(155,122,255,0.1)",
  },
  submitScoreBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  submitScoreBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  enteredScores: { marginTop: 16, width: "100%", gap: 6 },
  enteredScoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  enteredScoreEmoji: { fontSize: 20 },
  enteredScoreName: { flex: 1, fontSize: 14 },
  enteredScoreValue: { fontSize: 18, fontWeight: "800" },
  resultsContent: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, alignItems: "center" },
  resultsTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  resultsEmoji: { fontSize: 72, marginTop: 8 },
  resultsBelief: { fontSize: 24, fontWeight: "800", marginBottom: 20 },
  groupScoreCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    width: "100%",
  },
  groupScoreLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },
  groupScoreValue: { fontSize: 80, fontWeight: "900", lineHeight: 90 },
  groupScoreMax: { fontSize: 16, marginTop: -8 },
  groupScoreFieldLabel: { fontSize: 16, fontWeight: "800", marginTop: 8, letterSpacing: 1 },
  groupScoreDesc: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  individualScores: { width: "100%", marginBottom: 20 },
  individualTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  individualRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  individualEmoji: { fontSize: 22 },
  individualName: { fontSize: 14, fontWeight: "600", minWidth: 60 },
  topBadge: { fontSize: 11, color: "#FFD700" },
  individualScoreBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  individualScoreBarFill: { height: 6, borderRadius: 3 },
  individualScore: { fontSize: 18, fontWeight: "900", minWidth: 36, textAlign: "right" },
  amplificationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    width: "100%",
  },
  amplificationEmoji: { fontSize: 24 },
  amplificationText: { flex: 1, fontSize: 13, lineHeight: 20 },
  resultActions: { width: "100%", gap: 10 },
  resultBtn: { paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  resultBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  setupContent: { paddingHorizontal: 16, paddingBottom: 20 },
  setupHeader: { paddingTop: 16, paddingBottom: 20 },
  setupTitle: { fontSize: 28, fontWeight: "900" },
  setupSubtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  sessionCodeCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  sessionCodeLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" },
  sessionCode: { fontSize: 32, fontWeight: "900", letterSpacing: 4, marginVertical: 8 },
  sessionCodeHint: { fontSize: 12, textAlign: "center" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  beliefPickerBtn: { padding: 14, borderRadius: 14, borderWidth: 1 },
  beliefPickerSelected: { flexDirection: "row", alignItems: "center", gap: 10 },
  beliefPickerEmoji: { fontSize: 24 },
  beliefPickerName: { flex: 1, fontSize: 15, fontWeight: "600" },
  beliefPickerChange: { fontSize: 13, fontWeight: "600" },
  beliefPickerPlaceholder: { fontSize: 14 },
  beliefPickerDropdown: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  beliefSearchInput: {
    padding: 12,
    fontSize: 14,
    borderBottomWidth: 1,
  },
  beliefPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderBottomWidth: 0.5,
  },
  beliefPickerItemEmoji: { fontSize: 20 },
  beliefPickerItemName: { fontSize: 14, fontWeight: "500" },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  participantRowEmoji: { fontSize: 24 },
  participantRowName: { flex: 1, fontSize: 15, fontWeight: "600" },
  removeBtn: { fontSize: 16, fontWeight: "700", padding: 4 },
  addParticipantRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  addParticipantInput: { flex: 1, fontSize: 14, padding: 10 },
  addParticipantBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addParticipantBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  howItWorks: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  howItWorksTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  howItWorksText: { fontSize: 13, lineHeight: 22, marginBottom: 10 },
  howItWorksScience: { fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  startBtn: {
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  startBtnText: { fontSize: 16, fontWeight: "700" },
});
