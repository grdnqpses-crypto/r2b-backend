/**
 * useReferral — Referral system for the Belief Field Detector.
 *
 * Each user gets a unique referral code. When someone installs the app
 * using a referral link, both the referrer and the referee get 1 free week
 * of premium access.
 *
 * Since this is a local app without a backend, referrals are tracked locally.
 * The referral code is embedded in the share link, and when a new user opens
 * the app with that code, they get a free week and the referrer gets credited.
 *
 * In a production app with a backend, you'd validate referral codes server-side.
 */
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share, Platform } from "react-native";

const REFERRAL_KEY = "@belief_referral";
const APP_STORE_URL = "https://beliefdetec-3mwrpobt.manus.space";

export interface ReferralState {
  myCode: string;
  referredBy: string | null;
  referralCount: number;        // How many people used my code
  freeWeeksEarned: number;      // Total free weeks earned from referrals
  freeWeeksUsed: number;        // Free weeks already consumed
  freeWeeksRemaining: number;   // Available free weeks
  lastReferralDate: string | null;
}

function generateReferralCode(): string {
  // 6-character alphanumeric code, unique per device
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const DEFAULT_STATE: ReferralState = {
  myCode: generateReferralCode(),
  referredBy: null,
  referralCount: 0,
  freeWeeksEarned: 0,
  freeWeeksUsed: 0,
  freeWeeksRemaining: 0,
  lastReferralDate: null,
};

export function useReferral() {
  const [state, setState] = useState<ReferralState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(REFERRAL_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          setState({ ...DEFAULT_STATE, ...saved });
        } catch {}
      } else {
        // First time — save the generated code
        AsyncStorage.setItem(REFERRAL_KEY, JSON.stringify(DEFAULT_STATE));
      }
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (next: ReferralState) => {
    setState(next);
    await AsyncStorage.setItem(REFERRAL_KEY, JSON.stringify(next));
  }, []);

  /**
   * Share the referral link via the native share sheet.
   * Includes the referral code in the URL so the recipient gets credit.
   */
  const shareReferral = useCallback(async () => {
    const referralLink = `${APP_STORE_URL}?ref=${state.myCode}`;
    const message = `✨ Try Belief Field Detector — it uses your phone's sensors to scientifically measure how strong your belief is!\n\nUse my referral link and we both get 1 FREE week of premium:\n${referralLink}\n\nCode: ${state.myCode}`;
    try {
      await Share.share({
        message,
        url: Platform.OS === "ios" ? referralLink : undefined,
        title: "Belief Field Detector — Free Week",
      });
    } catch {}
  }, [state.myCode]);

  /**
   * Apply a referral code that someone else shared.
   * Gives the current user 1 free week and credits the referrer.
   * Returns true if the code was valid and applied.
   */
  const applyReferralCode = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed || trimmed.length !== 6) {
        return { success: false, message: "Invalid code. Codes are 6 characters long." };
      }
      if (trimmed === state.myCode) {
        return { success: false, message: "You can't use your own referral code!" };
      }
      if (state.referredBy) {
        return { success: false, message: "You've already used a referral code." };
      }

      const next: ReferralState = {
        ...state,
        referredBy: trimmed,
        freeWeeksEarned: state.freeWeeksEarned + 1,
        freeWeeksRemaining: state.freeWeeksRemaining + 1,
        lastReferralDate: new Date().toISOString(),
      };
      await save(next);
      return {
        success: true,
        message: `🎉 Code applied! You got 1 free week of premium. The person who shared this code also gets a free week.`,
      };
    },
    [state, save]
  );

  /**
   * Record that someone used my referral code (called when a referral is confirmed).
   * In a real app this would be a server call. Here we simulate it locally.
   */
  const recordReferralUsed = useCallback(async () => {
    const next: ReferralState = {
      ...state,
      referralCount: state.referralCount + 1,
      freeWeeksEarned: state.freeWeeksEarned + 1,
      freeWeeksRemaining: state.freeWeeksRemaining + 1,
      lastReferralDate: new Date().toISOString(),
    };
    await save(next);
  }, [state, save]);

  /**
   * Consume one free week (called when premium is activated via referral).
   */
  const consumeFreeWeek = useCallback(async () => {
    if (state.freeWeeksRemaining <= 0) return false;
    const next: ReferralState = {
      ...state,
      freeWeeksUsed: state.freeWeeksUsed + 1,
      freeWeeksRemaining: state.freeWeeksRemaining - 1,
    };
    await save(next);
    return true;
  }, [state, save]);

  return {
    referral: state,
    loaded,
    shareReferral,
    applyReferralCode,
    recordReferralUsed,
    consumeFreeWeek,
  };
}
