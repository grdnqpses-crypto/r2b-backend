import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "@/lib/safe-imports";

interface BedtimeMessageProps {
  itemName: string;
  itemEmoji: string;
  message: string;
  score: number;
  onDismiss: () => void;
}

export function BedtimeMessage({ itemName, itemEmoji, message, score, onDismiss }: BedtimeMessageProps) {
  const colors = useColors();
  const twinkle1 = useSharedValue(0.3);
  const twinkle2 = useSharedValue(0.6);
  const moonFloat = useSharedValue(0);

  useEffect(() => {
    twinkle1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    twinkle2.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    moonFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(8, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const star1Style = useAnimatedStyle(() => {
    'worklet';
    const v = typeof twinkle1.value === 'number' && isFinite(twinkle1.value) ? twinkle1.value : 0;
    return { opacity: v };
  });
  const star2Style = useAnimatedStyle(() => {
    'worklet';
    const v = typeof twinkle2.value === 'number' && isFinite(twinkle2.value) ? twinkle2.value : 0;
    return { opacity: v };
  });
  const moonStyle = useAnimatedStyle(() => {
    'worklet';
    const v = typeof moonFloat.value === 'number' && isFinite(moonFloat.value) ? moonFloat.value : 0;
    return { transform: [{ translateY: v }] };
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0a0a2e", "#1a1040", "#0a0a1a"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Stars */}
      <Animated.Text style={[styles.star, { top: "10%", left: "15%" }, star1Style]}>✦</Animated.Text>
      <Animated.Text style={[styles.star, { top: "8%", right: "20%" }, star2Style]}>✧</Animated.Text>
      <Animated.Text style={[styles.star, { top: "15%", left: "60%" }, star1Style]}>✦</Animated.Text>
      <Animated.Text style={[styles.star, { top: "20%", right: "10%" }, star2Style]}>✧</Animated.Text>
      <Animated.Text style={[styles.star, { top: "12%", left: "40%" }, star2Style]}>⋆</Animated.Text>

      {/* Moon */}
      <Animated.Text style={[styles.moon, moonStyle]}>🌙</Animated.Text>

      <View style={styles.content}>
        <Text style={styles.emoji}>{itemEmoji}</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Time for Bed!
        </Text>
        <Text style={[styles.score, { color: colors.primary }]}>
          Your {itemName} score: {score}!
        </Text>
        <View style={[styles.messageCard, { backgroundColor: "rgba(155,122,255,0.1)", borderColor: "rgba(155,122,255,0.3)" }]}>
          <Text style={[styles.message, { color: colors.foreground }]}>
            {message}
          </Text>
        </View>
        <Text style={[styles.hint, { color: colors.muted }]}>
          The magic works best while you dream...{"\n"}Sweet dreams! 💤
        </Text>
      </View>

      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => [
          styles.dismissBtn,
          { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <Text style={styles.dismissText}>Goodnight! 🌟</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingTop: 80, paddingBottom: 50, paddingHorizontal: 24 },
  star: { position: "absolute", fontSize: 20, color: "rgba(255,255,200,0.7)" },
  moon: { position: "absolute", top: "6%", right: "12%", fontSize: 48 },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  score: { fontSize: 16, fontWeight: "600", marginBottom: 24 },
  messageCard: { borderRadius: 20, borderWidth: 1, padding: 24, marginHorizontal: 8 },
  message: { fontSize: 17, lineHeight: 28, textAlign: "center", fontWeight: "500" },
  hint: { fontSize: 15, textAlign: "center", marginTop: 24, lineHeight: 24 },
  dismissBtn: { paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  dismissText: { fontSize: 18, fontWeight: "700", color: "#fff" },
});
