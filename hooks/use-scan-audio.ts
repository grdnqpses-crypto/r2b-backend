import { useRef, useCallback, useEffect } from "react";
import { Platform } from "react-native";

/**
 * Generates ambient scan audio using the Web Audio API (web) or
 * expo-speech as a fallback for native. The audio creates a pulsing
 * hum that intensifies with belief score.
 *
 * On native devices, we use expo-speech to produce periodic spoken
 * feedback cues that intensify with the score. On web, we use the
 * Web Audio API to create a synthesized ambient drone.
 */

// ---- Web Audio Engine ----
interface WebAudioEngine {
  ctx: AudioContext;
  oscillator1: OscillatorNode;
  oscillator2: OscillatorNode;
  gainNode: GainNode;
  lfoGain: GainNode;
  lfo: OscillatorNode;
}

function createWebAudio(): WebAudioEngine | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  try {
    const ctx = new AudioContext();

    // Main drone oscillator (low hum)
    const oscillator1 = ctx.createOscillator();
    oscillator1.type = "sine";
    oscillator1.frequency.value = 80; // Low base frequency

    // Harmonic oscillator
    const oscillator2 = ctx.createOscillator();
    oscillator2.type = "sine";
    oscillator2.frequency.value = 120;

    // LFO for pulsing effect
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.5; // Slow pulse

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.3;

    // Main gain
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;

    // Connections
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start();
    oscillator2.start();
    lfo.start();

    return { ctx, oscillator1, oscillator2, gainNode, lfoGain, lfo };
  } catch {
    return null;
  }
}

// ---- Native Speech Feedback (lazy-loaded with crash protection) ----
let Speech: typeof import("expo-speech") | null = null;
if (Platform.OS !== "web") {
  try {
    Speech = require("expo-speech");
  } catch {
    // expo-speech not available
  }
}

/** Safe wrapper for Speech.speak that catches TTS engine errors */
function safeSpeakText(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
  if (!Speech || Platform.OS === "web") return;
  try {
    Speech.speak(text, options);
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

const SCORE_CUES = [
  { threshold: 20, message: "Belief field detected" },
  { threshold: 40, message: "Strong energy building" },
  { threshold: 60, message: "Powerful field forming" },
  { threshold: 80, message: "Extraordinary energy" },
];

export function useScanAudio() {
  const webAudioRef = useRef<WebAudioEngine | null>(null);
  const isPlayingRef = useRef(false);
  const lastCueRef = useRef(-1);
  const speechIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    lastCueRef.current = -1;

    if (Platform.OS === "web") {
      webAudioRef.current = createWebAudio();
      if (webAudioRef.current) {
        // Fade in
        webAudioRef.current.gainNode.gain.setTargetAtTime(
          0.08,
          webAudioRef.current.ctx.currentTime,
          0.5
        );
      }
    }
  }, []);

  const updateIntensity = useCallback((score: number) => {
    if (!isPlayingRef.current) return;

    // Normalize 0-100 to usable ranges
    const normalized = Math.min(score / 100, 1);

    if (Platform.OS === "web" && webAudioRef.current) {
      const engine = webAudioRef.current;
      const now = engine.ctx.currentTime;

      // Increase volume with score
      const volume = 0.03 + normalized * 0.12;
      engine.gainNode.gain.setTargetAtTime(volume, now, 0.3);

      // Shift frequency up with intensity
      engine.oscillator1.frequency.setTargetAtTime(
        80 + normalized * 60,
        now,
        0.5
      );
      engine.oscillator2.frequency.setTargetAtTime(
        120 + normalized * 80,
        now,
        0.5
      );

      // Faster pulsing at higher scores
      engine.lfo.frequency.setTargetAtTime(
        0.3 + normalized * 2,
        now,
        0.5
      );

      // Deeper LFO modulation
      engine.lfoGain.gain.setTargetAtTime(
        0.2 + normalized * 0.4,
        now,
        0.3
      );
    }

    // Native speech cues at milestones
    if (Platform.OS !== "web") {
      for (let i = SCORE_CUES.length - 1; i >= 0; i--) {
        if (score >= SCORE_CUES[i].threshold && i > lastCueRef.current) {
          lastCueRef.current = i;
          safeSpeakText(SCORE_CUES[i].message, {
            rate: 0.9,
            pitch: 0.8 + normalized * 0.4,
            volume: 0.6,
          });
          break;
        }
      }
    }
  }, []);

  const stop = useCallback(() => {
    isPlayingRef.current = false;

    if (Platform.OS === "web" && webAudioRef.current) {
      const engine = webAudioRef.current;
      const now = engine.ctx.currentTime;
      // Fade out
      engine.gainNode.gain.setTargetAtTime(0, now, 0.3);
      setTimeout(() => {
        try {
          engine.oscillator1.stop();
          engine.oscillator2.stop();
          engine.lfo.stop();
          engine.ctx.close();
        } catch {
          // Already stopped
        }
        webAudioRef.current = null;
      }, 1000);
    }

    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }

    safeStopSpeech();
  }, []);

  // Play completion chime
  const playComplete = useCallback(() => {
    if (Platform.OS === "web") {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 523; // C5
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        // Rising chime
        osc.frequency.setTargetAtTime(659, ctx.currentTime + 0.1, 0.05); // E5
        osc.frequency.setTargetAtTime(784, ctx.currentTime + 0.2, 0.05); // G5
        gain.gain.setTargetAtTime(0, ctx.currentTime + 0.5, 0.1);
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 1000);
      } catch {
        // Audio not available
      }
    } else {
      safeSpeakText("Scan complete. Your belief field has been measured.", {
        rate: 0.85,
        pitch: 1.1,
        volume: 0.8,
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isPlayingRef.current) {
        stop();
      }
    };
  }, [stop]);

  return { start, stop, updateIntensity, playComplete };
}
