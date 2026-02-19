import { useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { type BeliefStory, type StorySegment } from "@/constants/belief-stories";

/**
 * Hook that narrates a BeliefStory during a scan by syncing TTS segments
 * to the scan progress (0-1). Call `updateProgress` on each tick.
 */
export function useBeliefStory() {
  const storyRef = useRef<BeliefStory | null>(null);
  const playedSegmentsRef = useRef<Set<number>>(new Set());
  const activeRef = useRef(false);

  const startStory = useCallback((story: BeliefStory) => {
    storyRef.current = story;
    playedSegmentsRef.current = new Set();
    activeRef.current = true;
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
        // Speak this segment
        if (Platform.OS !== "web") {
          Speech.speak(segment.text, {
            rate: segment.rate ?? 0.85,
            pitch: segment.pitch ?? 1.0,
            language: "en-US",
          });
        }
      }
    });
  }, []);

  const stopStory = useCallback(() => {
    activeRef.current = false;
    storyRef.current = null;
    playedSegmentsRef.current = new Set();
    if (Platform.OS !== "web") {
      Speech.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (Platform.OS !== "web") {
        Speech.stop();
      }
    };
  }, []);

  return {
    startStory,
    updateProgress,
    stopStory,
  };
}
