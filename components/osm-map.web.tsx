/**
 * Web stub for the OSM map component.
 * react-native-maps uses native codegen components that don't exist on web.
 * This stub renders a simple location info card instead.
 */
import { View, Text, StyleSheet } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface OsmMapProps {
  latitude: number;
  longitude: number;
  stores: Array<{ id: string; name: string; lat: number; lng: number }>;
}

export function OsmMap({ latitude, longitude }: OsmMapProps) {
  const colors = useColors();
  return (
    <View style={[styles.fallback, { backgroundColor: colors.surface }]}>
      <IconSymbol name="location.fill" size={24} color={colors.primary} />
      <Text style={[styles.text, { color: colors.muted }]}>
        {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { height: 80, alignItems: "center", justifyContent: "center", gap: 6 },
  text: { fontSize: 12 },
});
