import { useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import { type BeliefStory, type StorySegment } from "@/constants/belief-stories";

// Lazy-load expo-speech to prevent crashes if module isn't available
let Speech: typeof import("expo-speech") | null = null;
if (Platform.OS !== "web") {
  try {
    Speech = require("expo-speech");
  } catch {
    // expo-speech not available on this device
  }
}

/** Safe wrapper for Speech.speak that catches TTS engine errors */
function safeSpeakText(text: string, options?: { rate?: number; pitch?: number; language?: string }) {
  if (!Speech || Platform.OS === "web") return;
  try {
    Speech.speak(text, {
      rate: options?.rate ?? 0.85,
      pitch: options?.pitch ?? 1.0,
      language: options?.language ?? "en-US",
    });
  } catch (err) {
    console.warn("Speech.speak error:", err);
  }
}

/** Safe wrapper for Speech.stop */
function safeStopSpeech() {
  if (!Speech || Platform.OS === "web") return;
  try {
    Speech.stop();
  } catch (err) {
    console.warn("Speech.stop error:", err);
  }
}

/**
 * Hook that narrates a BeliefStory during a scan by syncing TTS segments
 * to the scan progress (0-1). Call `updateProgress` on each tick.
 */
export function useBeliefStory() {
  const storyRef = useRef<BeliefStory | null>(null);
  const playedSegmentsRef = useRef<Set<number>>(new Set());
  const activeRef = useRef(false);
  const speakingRef = useRef(false);

  const startStory = useCallback((story: BeliefStory) => {
    storyRef.current = story;
    playedSegmentsRef.current = new Set();
    activeRef.current = true;
    speakingRef.current = false;
  }, []);

  const updateProgress = useCallback((progress: number) => {
    if (!activeRef.current || !storyRef.current) return;
    const story = storyRef.current;

    story.segments.forEach((segment, index) => {
      if (
        progress >= segment.startAt &&
        !playedSegmentsRef.current.has(index)
      ) {
        playedSegmentsRef.current.add(index);
        safeSpeakText(segment.text, {
          rate: segment.rate,
          pitch: segment.pitch,
          language: "en-US",
        });
      }
    });
  }, []);

  const stopStory = useCallback(() => {
    activeRef.current = false;
    storyRef.current = null;
    playedSegmentsRef.current = new Set();
    safeStopSpeech();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      safeStopSpeech();
    };
  }, []);

  return {
    startStory,
    updateProgress,
    stopStory,
  };
}
