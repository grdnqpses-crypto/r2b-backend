import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface SelectedStore {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
}

export default function DashboardScreen() {
  const colors = useColors();
  const [stores, setStores] = useState<SelectedStore[]>([]);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [nearestStore, setNearestStore] = useState<SelectedStore | null>(null);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);
  const alertFiredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const s = await AsyncStorage.getItem("@r2b_selected_stores");
      const i = await AsyncStorage.getItem("@r2b_shopping_items");
      if (s) setStores(JSON.parse(s));
      if (i) setItems(JSON.parse(i));
    } catch {}
  };

  useEffect(() => {
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setLocationGranted(true);
        },
        () => setLocationGranted(false),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (userLat === null || userLng === null || stores.length === 0) return;
    let nearest: SelectedStore | null = null;
    let minDist = Infinity;
    for (const store of stores) {
      if (!store.lat || !store.lng) continue;
      const d = haversine(userLat, userLng, store.lat, store.lng);
      if (d < minDist) { minDist = d; nearest = store; }
    }
    setNearestStore(nearest);
    setDistanceMiles(nearest ? minDist : null);

    if (nearest && minDist <= 0.3 && !alertFiredRef.current.has("approach_" + nearest.id)) {
      alertFiredRef.current.add("approach_" + nearest.id);
      const itemNames = items.filter((i) => !i.checked).map((i) => i.name).join(", ");
      if (Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window) {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification("Remember2Buy", {
              body: `You are near ${nearest!.name}! Remember to buy: ${itemNames || "your items"}`,
            });
          }
        });
      }
    }
  }, [userLat, userLng, stores, items]);

  const pendingItems = items.filter((i) => !i.checked);
  const mapUrl =
    userLat && userLng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${userLng - 0.05},${userLat - 0.05},${userLng + 0.05},${userLat + 0.05}&layer=mapnik&marker=${userLat},${userLng}`
      : null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Remember2Buy</Text>
          <Text style={styles.headerSub}>Your Smart Shopping Reminder</Text>
        </View>

        <View style={[styles.mapContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {Platform.OS === "web" && mapUrl ? (
            <iframe
              src={mapUrl}
              style={{ width: "100%", height: 220, border: "none", borderRadius: 12 }}
              title="Your Location"
            />
          ) : (
            <View style={[styles.mapPlaceholder, { backgroundColor: colors.border }]}>
              <IconSymbol name="map.fill" size={40} color={colors.muted} />
              <Text style={[styles.mapPlaceholderText, { color: colors.muted }]}>
                {locationGranted ? "Map loading..." : "Enable location to see map"}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <IconSymbol name="location.fill" size={20} color={locationGranted ? colors.success : colors.muted} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {locationGranted ? "Location Active" : "Location Required"}
            </Text>
          </View>
          {!locationGranted && (
            <Text style={[styles.cardSub, { color: colors.muted }]}>
              Allow location access to receive store reminders
            </Text>
          )}
          {nearestStore && distanceMiles !== null && (
            <View style={[styles.nearestBadge, { backgroundColor: distanceMiles <= 0.3 ? colors.success + "22" : colors.primary + "11" }]}>
              <Text style={[styles.nearestText, { color: distanceMiles <= 0.3 ? colors.success : colors.primary }]}>
                {distanceMiles <= 0.3
                  ? `You are near ${nearestStore.name}!`
                  : `${nearestStore.name} is ${distanceMiles.toFixed(1)} mi away`}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <IconSymbol name="list.bullet" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Shopping List ({pendingItems.length} items)
            </Text>
          </View>
          {pendingItems.length === 0 ? (
            <Text style={[styles.cardSub, { color: colors.muted }]}>No items yet — go to My List to add items</Text>
          ) : (
            pendingItems.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                <Text style={[styles.itemText, { color: colors.foreground }]}>
                  {item.name}{item.quantity ? ` (${item.quantity})` : ""}
                </Text>
              </View>
            ))
          )}
          {pendingItems.length > 5 && (
            <Text style={[styles.cardSub, { color: colors.muted }]}>+{pendingItems.length - 5} more items</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <IconSymbol name="storefront.fill" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>My Stores ({stores.length})</Text>
          </View>
          {stores.length === 0 ? (
            <Text style={[styles.cardSub, { color: colors.muted }]}>No stores selected — go to Stores tab</Text>
          ) : (
            stores.slice(0, 3).map((store) => (
              <View key={store.id} style={styles.itemRow}>
                <View style={[styles.bullet, { backgroundColor: colors.success }]} />
                <Text style={[styles.itemText, { color: colors.foreground }]}>{store.name}</Text>
              </View>
            ))
          )}
          {stores.length > 3 && (
            <Text style={[styles.cardSub, { color: colors.muted }]}>+{stores.length - 3} more stores</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "33" }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>How It Works</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>1. Pick your stores in the Stores tab</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>2. Add items to your shopping list</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>3. Close the app — it runs in the background</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>4. Get reminded at 0.3 miles from the store</Text>
          <Text style={[styles.howStep, { color: colors.foreground }]}>5. Get reminded again 6 min after arriving</Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 20, alignItems: "center" },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  mapContainer: { margin: 16, borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  mapPlaceholder: { height: 180, alignItems: "center", justifyContent: "center", gap: 8 },
  mapPlaceholderText: { fontSize: 14 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderWidth: 1, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 13, lineHeight: 18 },
  nearestBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  nearestText: { fontSize: 13, fontWeight: "600" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  itemText: { fontSize: 14 },
  howStep: { fontSize: 13, lineHeight: 22 },
});
