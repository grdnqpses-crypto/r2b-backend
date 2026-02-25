import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { LiveScanner } from "./live-scanner";
import { BeliefFieldOrb } from "./belief-field-orb";
import type { BeliefOption } from "@/constants/beliefs";
import type { ScanResult } from "@/hooks/use-scan-history";
import { Haptics } from "@/lib/safe-imports";

interface ChallengeFriendProps {
  belief: BeliefOption;
  intensity: number;
  onComplete: (result: ScanResult) => void;
  onCancel: () => void;
}

type Phase = "setup" | "player1-scan" | "player1-done" | "player2-scan" | "results";

export function ChallengeFriend({ belief, intensity, onComplete, onCancel }: ChallengeFriendProps) {
  const colors = useColors();
  const [phase, setPhase] = useState<Phase>("setup");
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [player1Result, setPlayer1Result] = useState<ScanResult | null>(null);
  const [player2Result, setPlayer2Result] = useState<ScanResult | null>(null);

  const p1 = player1Name.trim() || "Player 1";
  const p2 = player2Name.trim() || "Player 2";

  const handlePlayer1Complete = useCallback((result: ScanResult) => {
    setPlayer1Result(result);
    setPhase("player1-done");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const handlePlayer2Complete = useCallback(
    (result: ScanResult) => {
      setPlayer2Result(result);
      setPhase("results");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Save the higher-scoring result to history
      if (player1Result && result.score >= player1Result.score) {
        onComplete(result);
      } else if (player1Result) {
        onComplete(player1Result);
      }
    },
    [player1Result, onComplete]
  );

  // Setup screen
  if (phase === "setup") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerEmoji}>🏆</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Challenge a Friend
          </Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            Both players will scan their belief in {belief.emoji} {belief.name} — whoever has the
            stronger belief field wins!
          </Text>

          {/* Rules */}
          <View style={[styles.rulesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.rulesTitle, { color: colors.foreground }]}>How It Works</Text>
            <Text style={[styles.ruleItem, { color: colors.muted }]}>
              1. Player 1 holds the phone and focuses on their belief for 60 seconds
            </Text>
            <Text style={[styles.ruleItem, { color: colors.muted }]}>
              2. Hand the phone to Player 2 for their 60-second scan
            </Text>
            <Text style={[styles.ruleItem, { color: colors.muted }]}>
              3. Compare your belief field scores — the strongest believer wins!
            </Text>
          </View>

          {/* Name inputs */}
          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Player 1 Name</Text>
          <TextInput
            value={player1Name}
            onChangeText={setPlayer1Name}
            placeholder="Enter name..."
            placeholderTextColor={colors.muted}
            style={[styles.nameInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            maxLength={20}
            returnKeyType="next"
          />

          <Text style={[styles.inputLabel, { color: colors.foreground }]}>Player 2 Name</Text>
          <TextInput
            value={player2Name}
            onChangeText={setPlayer2Name}
            placeholder="Enter name..."
            placeholderTextColor={colors.muted}
            style={[styles.nameInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            maxLength={20}
            returnKeyType="done"
          />

          {/* Start */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPhase("player1-scan");
            }}
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <Text style={styles.startBtnText}>Start Challenge</Text>
            <Text style={styles.startBtnSub}>{p1} goes first</Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // Player 1 scanning
  if (phase === "player1-scan") {
    return (
      <LiveScanner
        belief={{ ...belief, name: `${belief.name} (${p1}'s turn)` }}
        intensity={intensity}
        onComplete={handlePlayer1Complete}
        onCancel={onCancel}
      />
    );
  }

  // Player 1 done, hand to Player 2
  if (phase === "player1-done" && player1Result) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerEmoji}>🤝</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {p1}'s Turn Complete!
          </Text>

          <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.scoreCardEmoji}>{belief.emoji}</Text>
            <Text style={[styles.scoreCardName, { color: colors.foreground }]}>{p1}</Text>
            <Text style={[styles.scoreCardScore, { color: colors.primary }]}>
              {player1Result.score}/100
            </Text>
          </View>

          <View style={[styles.handoffCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
            <Text style={styles.handoffEmoji}>📱</Text>
            <Text style={[styles.handoffText, { color: colors.warning }]}>
              Hand the phone to {p2} now!
            </Text>
            <Text style={[styles.handoffSub, { color: colors.muted }]}>
              Don't show {p2} the score — keep it a surprise until the end!
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPhase("player2-scan");
            }}
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <Text style={styles.startBtnText}>{p2}'s Turn</Text>
            <Text style={styles.startBtnSub}>Tap when {p2} is ready</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // Player 2 scanning
  if (phase === "player2-scan") {
    return (
      <LiveScanner
        belief={{ ...belief, name: `${belief.name} (${p2}'s turn)` }}
        intensity={intensity}
        onComplete={handlePlayer2Complete}
        onCancel={onCancel}
      />
    );
  }

  // Results comparison
  if (phase === "results" && player1Result && player2Result) {
    const winner =
      player1Result.score > player2Result.score
        ? p1
        : player2Result.score > player1Result.score
        ? p2
        : null;
    const isDraw = player1Result.score === player2Result.score;
    const diff = Math.abs(player1Result.score - player2Result.score);

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Winner announcement */}
          <Text style={styles.headerEmoji}>{isDraw ? "🤝" : "🏆"}</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {isDraw ? "It's a Draw!" : `${winner} Wins!`}
          </Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>
            {isDraw
              ? `Both players showed equally powerful belief in ${belief.name}!`
              : `${winner}'s belief in ${belief.name} was ${diff} points stronger!`}
          </Text>

          {/* Side by side comparison */}
          <View style={styles.compareRow}>
            {/* Player 1 */}
            <View
              style={[
                styles.compareCard,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    player1Result.score >= player2Result.score
                      ? colors.success + "80"
                      : colors.border,
                },
              ]}
            >
              {player1Result.score > player2Result.score && (
                <Text style={styles.crownEmoji}>👑</Text>
              )}
              <View style={styles.miniOrbWrap}>
                <BeliefFieldOrb
                  intensity={player1Result.score / 100}
                  score={player1Result.score}
                  beliefEmoji={belief.emoji}
                  phase="complete"
                  size={80}
                />
              </View>
              <Text style={[styles.compareName, { color: colors.foreground }]}>{p1}</Text>
              <Text style={[styles.compareScore, { color: colors.primary }]}>
                {player1Result.score}
              </Text>
              <Text style={[styles.compareLabel, { color: colors.muted }]}>points</Text>
            </View>

            {/* VS */}
            <View style={styles.vsContainer}>
              <Text style={[styles.vsText, { color: colors.muted }]}>VS</Text>
            </View>

            {/* Player 2 */}
            <View
              style={[
                styles.compareCard,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    player2Result.score >= player1Result.score
                      ? colors.success + "80"
                      : colors.border,
                },
              ]}
            >
              {player2Result.score > player1Result.score && (
                <Text style={styles.crownEmoji}>👑</Text>
              )}
              <View style={styles.miniOrbWrap}>
                <BeliefFieldOrb
                  intensity={player2Result.score / 100}
                  score={player2Result.score}
                  beliefEmoji={belief.emoji}
                  phase="complete"
                  size={80}
                />
              </View>
              <Text style={[styles.compareName, { color: colors.foreground }]}>{p2}</Text>
              <Text style={[styles.compareScore, { color: colors.primary }]}>
                {player2Result.score}
              </Text>
              <Text style={[styles.compareLabel, { color: colors.muted }]}>points</Text>
            </View>
          </View>

          {/* Sensor comparison */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sensor Comparison</Text>
          {player1Result.sensorBreakdown.map((s1, idx) => {
            const s2 = player2Result.sensorBreakdown[idx];
            if (!s2) return null;
            const p1Higher = s1.deviationPercent >= s2.deviationPercent;
            return (
              <View
                key={s1.sensorId}
                style={[styles.sensorCompare, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.sensorCompareName, { color: colors.foreground }]}>
                  {s1.sensorName}
                </Text>
                <View style={styles.sensorCompareRow}>
                  <Text
                    style={[
                      styles.sensorCompareVal,
                      { color: p1Higher ? colors.success : colors.muted },
                    ]}
                  >
                    {p1}: {s1.deviationPercent.toFixed(1)}%
                  </Text>
                  <Text
                    style={[
                      styles.sensorCompareVal,
                      { color: !p1Higher ? colors.success : colors.muted },
                    ]}
                  >
                    {p2}: {s2.deviationPercent.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Encouragement */}
          <View style={[styles.encourageCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.encourageText, { color: colors.primary }]}>
              {isDraw
                ? "Amazing! You both believe with equal power. That's a rare and special connection!"
                : `Great challenge! Remember, belief grows stronger with practice. Try again tomorrow and see if the scores change!`}
            </Text>
          </View>

          {/* Done */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCancel();
            }}
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
          >
            <Text style={styles.startBtnText}>Done</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, alignItems: "center" },
  headerEmoji: { fontSize: 56, textAlign: "center", marginBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: "900", textAlign: "center", marginBottom: 6 },
  headerSub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
  rulesCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24, width: "100%" },
  rulesTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  ruleItem: { fontSize: 14, lineHeight: 22, marginBottom: 4 },
  inputLabel: { fontSize: 14, fontWeight: "700", marginBottom: 6, alignSelf: "flex-start" },
  nameInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    width: "100%",
  },
  startBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  startBtnText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  startBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  cancelText: { fontSize: 15, fontWeight: "600" },
  scoreCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  scoreCardEmoji: { fontSize: 36, marginBottom: 6 },
  scoreCardName: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  scoreCardScore: { fontSize: 36, fontWeight: "900" },
  handoffCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  handoffEmoji: { fontSize: 36, marginBottom: 8 },
  handoffText: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  handoffSub: { fontSize: 13, textAlign: "center", marginTop: 6 },
  compareRow: { flexDirection: "row", gap: 8, marginBottom: 20, width: "100%", alignItems: "center" },
  compareCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: "center",
  },
  crownEmoji: { fontSize: 24, position: "absolute", top: -14 },
  miniOrbWrap: { marginVertical: 8 },
  compareName: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  compareScore: { fontSize: 32, fontWeight: "900" },
  compareLabel: { fontSize: 12, fontWeight: "500" },
  vsContainer: { paddingHorizontal: 4 },
  vsText: { fontSize: 16, fontWeight: "900" },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12, alignSelf: "flex-start" },
  sensorCompare: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    width: "100%",
  },
  sensorCompareName: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  sensorCompareRow: { flexDirection: "row", justifyContent: "space-between" },
  sensorCompareVal: { fontSize: 13, fontWeight: "600" },
  encourageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    width: "100%",
  },
  encourageText: { fontSize: 14, lineHeight: 22, textAlign: "center", fontWeight: "600" },
});
