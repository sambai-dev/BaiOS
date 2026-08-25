// SPDX-License-Identifier: AGPL-3.0-or-later
// Attribution and additional terms: see NOTICE.md.

/**
 * Pure Web Audio API haptic sound synthesizer for Workbench OS.
 * Zero external assets or network requests; generates sub-15ms mechanical relays,
 * focus thuds, snapping clicks, and warm frequency chimes using oscillator synthesis.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export type SoundEffectType = "click" | "focus" | "snap" | "chime" | "delete" | "keystroke";

export function setWorkbenchSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("sam-workbench-sound-enabled", enabled ? "true" : "false");
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Resolves the persisted sound preference with OPT-IN semantics:
 * only an explicit stored "true" enables sound; first-time visitors
 * (no stored value) and storage failures resolve to OFF.
 */
export function resolveSoundEnabledPreference(stored: string | null): boolean {
  return stored === "true";
}

export function isWorkbenchSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return resolveSoundEnabledPreference(
      localStorage.getItem("sam-workbench-sound-enabled"),
    );
  } catch {
    return false;
  }
}

export function playSound(type: SoundEffectType) {
  // Honor either the in-session toggle or a persisted opt-in; both default OFF.
  if (!soundEnabled && !isWorkbenchSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    switch (type) {
      case "click": {
        // Ultra-short 6ms mechanical relay click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.008);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.009);
        break;
      }

      case "focus": {
        // Low 12ms focus thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.014);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.015);
        break;
      }

      case "snap": {
        // 18ms snappy latch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.02);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.022);
        break;
      }

      case "chime": {
        // 35ms harmonic chime for opening apps or ready state
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.04); // A5

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(1174.66, now); // D6

        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.05);
        osc2.stop(now + 0.05);
        break;
      }

      case "delete": {
        // Subtle descending glitch tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.025);

        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.028);
        break;
      }

      case "keystroke": {
        // 4ms micro-tick for terminal typing
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(2200 + Math.random() * 400, now);

        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.004);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.005);
        break;
      }
    }
  } catch {
    // Gracefully handle browser autoplay blocks
  }
}
