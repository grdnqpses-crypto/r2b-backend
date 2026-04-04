import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

interface ToolItem {
  icon: string;
  label: string;
  description: string;
  route: string;
  badge?: string;
}

interface ToolSection {
  title: string;
  emoji: string;
  color: string;
  tools: ToolItem[];
}

const TOOL_SECTIONS: ToolSection[] = [
  {
    title: "Savings & Coupons",
    emoji: "🏷️",
    color: "#22C55E",
    tools: [
      {
        icon: "tag.fill",
        label: "Coupons & Deals",
        description: "Manage coupons, loyalty cards & cashback",
        route: "/(tabs)/coupons",
      },
      {
        icon: "dollarsign.circle.fill",
        label: "Never Pay Full Price",
        description: "Ibotta, Flipp, Fetch, Rakuten & stacking tips",
        route: "/never-full-price",
        badge: "HOT",
      },
      {
        icon: "bell.badge.fill",
        label: "Price Drop Watchlist",
        description: "Watch items & get notified when prices drop",
        route: "/watchlist",
      },
      {
        icon: "cart.badge.plus",
        label: "Healthy Swaps",
        description: "Healthier alternatives with savings info",
        route: "/healthy-swaps",
      },
    ],
  },
  {
    title: "Budget & Spending",
    emoji: "💰",
    color: "#F59E0B",
    tools: [
      {
        icon: "chart.bar.fill",
        label: "Budget Tracker",
        description: "Set budgets, log trips & track spending",
        route: "/budget",
      },
      {
        icon: "cart.fill",
        label: "Unit Price Calculator",
        description: "Compare price per oz/lb/unit across brands",
        route: "/price-calculator",
      },
      {
        icon: "receipt",
        label: "Receipt Scanner",
        description: "Scan receipts to auto-log trip amounts",
        route: "/receipt-scanner",
      },
      {
        icon: "target",
        label: "Savings Goal",
        description: "Set and track monthly savings goals",
        route: "/savings-goal",
      },
      {
        icon: "chart.bar.fill",
        label: "Price History",
        description: "Track price changes over time",
        route: "/price-history",
      },
    ],
  },
  {
    title: "AI & Smart Features",
    emoji: "🤖",
    color: "#8B5CF6",
    tools: [
      {
        icon: "fork.knife",
        label: "Meal Planner",
        description: "Search recipes & auto-add ingredients",
        route: "/meal-planner",
        badge: "AI",
      },
      {
        icon: "leaf.fill",
        label: "What's In Season",
        description: "Freshest & cheapest produce this month",
        route: "/in-season",
      },
      {
        icon: "heart.fill",
        label: "Healthy Swaps",
        description: "AI-powered healthier alternatives",
        route: "/healthy-swaps",
        badge: "AI",
      },
      {
        icon: "questionmark.circle.fill",
        label: "I Forgot Something",
        description: "Post-trip check for unchecked items",
        route: "/forgot-check",
      },
      {
        icon: "leaf.fill",
        label: "Dietary Filter",
        description: "Flag items that don't match your diet",
        route: "/dietary-filter",
        badge: "AI",
      },
      {
        icon: "fork.knife",
        label: "Recipe Import",
        description: "Import ingredients from any recipe URL",
        route: "/recipe-import",
        badge: "AI",
      },
    ],
  },
  {
    title: "Shopping Tools",
    emoji: "🛒",
    color: "#0EA5E9",
    tools: [
      {
        icon: "person.2.fill",
        label: "Shopping Buddy",
        description: "Split list between two shoppers",
        route: "/shopping-buddy",
      },
      {
        icon: "archivebox.fill",
        label: "Pantry Mode",
        description: "Track what you have at home",
        route: "/pantry",
      },
      {
        icon: "bell.fill",
        label: "Smart Reminders",
        description: "Scheduled & weather-aware reminders",
        route: "/reminders",
      },
    ],
  },
  {
    title: "Achievements",
    emoji: "🏆",
    color: "#F59E0B",
    tools: [
      {
        icon: "star.fill",
        label: "Achievements & Badges",
        description: "Track streaks, badges & savings milestones",
        route: "/achievements",
      },
    ],
  },
  {
    title: "Eco & Community",
    emoji: "🌱",
    color: "#10B981",
    tools: [
      {
        icon: "leaf.fill",
        label: "Carbon Footprint",
        description: "Track your basket's environmental impact",
        route: "/carbon-footprint",
      },
    ],
  },
  {
    title: "Export & Share",
    emoji: "📤",
    color: "#6B7280",
    tools: [
      {
        icon: "square.and.arrow.up",
        label: "Export List",
        description: "Share or export your shopping list as PDF",
        route: "/(tabs)/list",
      },
    ],
  },
];

export default function ToolsScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleTool = (route: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Tools & Features
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          All your power tools in one place — clean and simple.
        </Text>

        {TOOL_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>{section.emoji}</Text>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {section.title}
              </Text>
            </View>

            <View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {section.tools.map((tool, idx) => (
                <TouchableOpacity
                  key={tool.route + tool.label}
                  style={[
                    styles.toolRow,
                    idx < section.tools.length - 1 && {
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                  onPress={() => handleTool(tool.route)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: section.color + "20" },
                    ]}
                  >
                    <IconSymbol
                      name={tool.icon as any}
                      size={20}
                      color={section.color}
                    />
                  </View>
                  <View style={styles.toolText}>
                    <View style={styles.toolLabelRow}>
                      <Text
                        style={[styles.toolLabel, { color: colors.foreground }]}
                      >
                        {tool.label}
                      </Text>
                      {tool.badge && (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor:
                                tool.badge === "AI" ? "#8B5CF6" : "#EF4444",
                            },
                          ]}
                        >
                          <Text style={styles.badgeText}>{tool.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.toolDesc, { color: colors.muted }]}
                      numberOfLines={1}
                    >
                      {tool.description}
                    </Text>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  sectionEmoji: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: {
    flex: 1,
  },
  toolLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  toolDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
