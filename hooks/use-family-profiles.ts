import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILES_KEY = "@r2b_profiles";
const ACTIVE_PROFILE_KEY = "@r2b_active_profile";

export interface FamilyProfile {
  id: string;
  name: string;
  emoji: string;
  createdAt: string;
  color: string;
}

const PROFILE_COLORS = [
  "#9B7AFF", "#FF6B9D", "#4ECDC4", "#FFD93D", "#6BCB77",
  "#FF8C42", "#45B7D1", "#E056A0", "#7EC8E3", "#C4E538",
];

const PROFILE_EMOJIS = [
  "👤", "👧", "👦", "👩", "👨", "👶", "🧒", "👵", "👴", "🧑",
  "🦸", "🧙", "🧚", "🦹", "🤴", "👸", "🧝", "🧜", "🧞", "🎅",
];

let profileCounter = 0;

export function createProfile(name: string, emoji: string): FamilyProfile {
  profileCounter += 1;
  return {
    id: `profile-${Date.now()}-${profileCounter}`,
    name,
    emoji,
    createdAt: new Date().toISOString(),
    color: PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)],
  };
}

export { PROFILE_EMOJIS };

export function useFamilyProfiles() {
  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [profStr, activeStr] = await Promise.all([
          AsyncStorage.getItem(PROFILES_KEY),
          AsyncStorage.getItem(ACTIVE_PROFILE_KEY),
        ]);
        if (profStr) {
          const parsed = JSON.parse(profStr) as FamilyProfile[];
          setProfiles(parsed);
          if (activeStr && parsed.some((p) => p.id === activeStr)) {
            setActiveProfileId(activeStr);
          } else if (parsed.length > 0) {
            setActiveProfileId(parsed[0].id);
          }
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const saveProfiles = useCallback(async (profs: FamilyProfile[]) => {
    setProfiles(profs);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profs));
  }, []);

  const addProfile = useCallback(
    async (name: string, emoji: string) => {
      const profile = createProfile(name, emoji);
      const updated = [...profiles, profile];
      await saveProfiles(updated);
      // If this is the first profile, make it active
      if (profiles.length === 0) {
        setActiveProfileId(profile.id);
        await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
      }
      return profile;
    },
    [profiles, saveProfiles]
  );

  const removeProfile = useCallback(
    async (id: string) => {
      const updated = profiles.filter((p) => p.id !== id);
      await saveProfiles(updated);
      if (activeProfileId === id) {
        const newActive = updated.length > 0 ? updated[0].id : null;
        setActiveProfileId(newActive);
        if (newActive) {
          await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, newActive);
        } else {
          await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
        }
      }
    },
    [profiles, activeProfileId, saveProfiles]
  );

  const switchProfile = useCallback(
    async (id: string) => {
      if (profiles.some((p) => p.id === id)) {
        setActiveProfileId(id);
        await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);
      }
    },
    [profiles]
  );

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  return {
    profiles,
    activeProfile,
    activeProfileId,
    loaded,
    addProfile,
    removeProfile,
    switchProfile,
  };
}
