import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, View, Text, StyleSheet } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useState } from "react";
import { getShoppingItems } from "@/lib/storage";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

function ListTabIcon({ color }: { color: string }) {
  const [uncheckedCount, setUncheckedCount] = useState(0);
  const colors = useColors();

  const refresh = useCallback(async () => {
    try {
      const items = await getShoppingItems();
      setUncheckedCount(items.filter((i) => !i.checked).length);
    } catch {}
  }, []);

  // Refresh when tab comes into focus
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Also refresh on mount
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <View style={badgeStyles.container}>
      <IconSymbol size={26} name="list.bullet" color={color} />
      {uncheckedCount > 0 && (
        <View style={[badgeStyles.badge, { backgroundColor: colors.error }]}>
          <Text style={badgeStyles.badgeText}>
            {uncheckedCount > 99 ? "99+" : uncheckedCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700", lineHeight: 14 },
});

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: "My List",
          tabBarIcon: ({ color }) => <ListTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: "Stores",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="storefront.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="coupons"
        options={{
          title: "Coupons",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="tag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
