/**
 * Confetti Animation Component
 * Lightweight confetti using React Native Animated — no external packages needed.
 * Triggered when all shopping items are checked off.
 */
import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"];
const PIECE_COUNT = 40;

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  isCircle: boolean;
}

interface ConfettiProps {
  visible: boolean;
  onComplete?: () => void;
}

export function Confetti({ visible, onComplete }: ConfettiProps) {
  const pieces = useRef<ConfettiPiece[]>(
    Array.from({ length: PIECE_COUNT }, (_, i) => ({
      x: new Animated.Value(Math.random() * SCREEN_WIDTH),
      y: new Animated.Value(-20),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 8,
      isCircle: Math.random() > 0.5,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // Reset all pieces
    pieces.forEach((p) => {
      p.x.setValue(Math.random() * SCREEN_WIDTH);
      p.y.setValue(-20 - Math.random() * 100);
      p.rotate.setValue(0);
      p.opacity.setValue(1);
    });

    // Animate all pieces falling
    const animations = pieces.map((p, i) => {
      const delay = i * 30;
      const duration = 1800 + Math.random() * 1200;
      const targetX = (p.x as unknown as { _value: number })._value + (Math.random() - 0.5) * 200;

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.y, {
            toValue: SCREEN_HEIGHT + 50,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.x, {
            toValue: targetX,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.rotate, {
            toValue: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 4),
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(duration * 0.7),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: duration * 0.3,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, i) => (
        <Animated.View
          key={i}
          style={[
            styles.piece,
            {
              width: piece.size,
              height: piece.isCircle ? piece.size : piece.size * 1.5,
              borderRadius: piece.isCircle ? piece.size / 2 : 2,
              backgroundColor: piece.color,
              opacity: piece.opacity,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotate.interpolate({
                    inputRange: [-4, 4],
                    outputRange: ["-720deg", "720deg"],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
