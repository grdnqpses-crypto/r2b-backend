import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Animated, Pressable, ScrollView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/use-colors";
import type { SavingsStack } from "@/lib/couponEngine";

interface SavingsCardProps {
  stack: SavingsStack;
  storeName?: string;
  onDismiss: () => void;
  onViewCoupons?: () => void;
}

export function SavingsCard({ stack, storeName, onDismiss, onViewCoupons }: SavingsCardProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 70,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function handleDismiss() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onDismiss);
  }

  const totalSavings = stack.totalEstimatedSavings;

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: "#22C55E",
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>💰</Text>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Savings Available!
            </Text>
            {storeName && (
              <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
                Near {storeName}
              </Text>
            )}
          </View>
          <Pressable onPress={handleDismiss} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.muted }]}>✕</Text>
          </Pressable>
        </View>

        {/* Total savings banner */}
        {totalSavings > 0 && (
          <View style={[styles.savingsBanner, { backgroundColor: "#22C55E" + "22", borderColor: "#22C55E" }]}>
            <Text style={[styles.savingsAmount, { color: "#22C55E" }]}>
              Save up to ${totalSavings.toFixed(2)}
            </Text>
            <Text style={[styles.savingsCount, { color: colors.muted }]}>
              {stack.coupons.length} coupon{stack.coupons.length !== 1 ? "s" : ""} matched
            </Text>
          </View>
        )}

        {/* Coupon list */}
        <ScrollView style={styles.couponList} showsVerticalScrollIndicator={false}>
          {stack.coupons.slice(0, 5).map((match, i) => (
            <View
              key={match.coupon.id}
              style={[styles.couponRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.couponInfo}>
                <Text style={[styles.couponStore, { color: colors.foreground }]}>
                  {match.coupon.storeName || "Any Store"}
                </Text>
                <Text style={[styles.couponDesc, { color: colors.muted }]} numberOfLines={1}>
                  {match.coupon.description || "Coupon available"}
                </Text>
                {match.matchedItems.length > 0 && (
                  <Text style={[styles.couponItems, { color: "#22C55E" }]}>
                    Matches: {match.matchedItems.map((i) => i.text).join(", ")}
                  </Text>
                )}
              </View>
              <View style={styles.couponSavings}>
                <Text style={[styles.savingsText, { color: "#22C55E" }]}>
                  {match.savingsText}
                </Text>
                {match.isExpiringSoon && (
                  <Text style={[styles.expiryBadge, { color: "#F59E0B" }]}>⏰ Expires soon</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          {onViewCoupons && (
            <Pressable
              onPress={onViewCoupons}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: "#22C55E", opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.primaryBtnText}>View Coupons</Text>
            </Pressable>
          )}
          <Pressable onPress={handleDismiss} style={styles.secondaryBtn}>
            <Text style={[styles.secondaryBtnText, { color: colors.muted }]}>Dismiss</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 9998,
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: "600",
  },
  savingsBanner: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  savingsAmount: {
    fontSize: 22,
    fontWeight: "800",
  },
  savingsCount: {
    fontSize: 12,
    marginTop: 2,
  },
  couponList: {
    maxHeight: 240,
    paddingHorizontal: 20,
  },
  couponRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  couponInfo: {
    flex: 1,
    gap: 2,
  },
  couponStore: {
    fontSize: 14,
    fontWeight: "600",
  },
  couponDesc: {
    fontSize: 12,
  },
  couponItems: {
    fontSize: 11,
    marginTop: 2,
  },
  couponSavings: {
    alignItems: "flex-end",
    gap: 2,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: "700",
  },
  expiryBadge: {
    fontSize: 10,
  },
  actions: {
    padding: 20,
    paddingTop: 16,
    gap: 8,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
  },
});
