import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const MAPPING: Record<string, MaterialIconName> = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  // App tabs
  "sensor.fill": "sensors",
  "clock.fill": "history",
  "book.fill": "menu-book",
  // Sensor icons
  "waveform.path": "show-chart",
  "gyroscope": "screen-rotation",
  "magnet": "explore",
  "barometer": "speed",
  "light.max": "light-mode",
  "move.3d": "3d-rotation",
  "figure.walk": "directions-walk",
  // Belief icons
  "star.fill": "star",
  "heart.fill": "favorite",
  "sparkles": "auto-awesome",
  "moon.fill": "nightlight-round",
  "bolt.fill": "bolt",
  "eye.fill": "visibility",
  "hand.raised.fill": "pan-tool",
  "leaf.fill": "eco",
  "globe": "public",
  "cross.fill": "add",
  "person.fill": "person",
  "info.circle.fill": "info",
  "arrow.right": "arrow-forward",
  "xmark": "close",
  "checkmark.circle.fill": "check-circle",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "square.and.arrow.up": "share",
  "gear": "settings",
  "gear.circle.fill": "settings",
  "bed.double.fill": "bedtime",
  "scope": "biotech",
  "person.2.fill": "people",
  "crown.fill": "workspace-premium",
};

type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name as string] ?? "help-outline";
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
