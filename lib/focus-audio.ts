// Distinct Web Audio cues for Pomodoro phase transitions. Extracted so tests
// can mock `playFocusChime` and assert which cue fires on which transition
// (jsdom has no AudioContext, so the real synth is untestable there).

export type FocusChime = 'focus' | 'break' | 'set';

/**
 *  - 'focus': a bright ascending C-major arpeggio (C5–E5–G5) — the "go" cue.
 *  - 'break': a soft descending pair (A4–E4) on a triangle wave — the "rest" cue.
 *  - 'set':   a bright sustained C-major chord topped with a high C6 bell — the
 *             "set complete" cue played at the end of every final long break.
 *
 * Guarded for SSR and environments without Web Audio; never throws.
 */
export function playFocusChime(kind: FocusChime): void {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    void ctx.resume?.().catch(() => {});
    const voice = (freq: number, start: number, dur: number, peak: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = type;
      const t0 = ctx.currentTime + start;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    };
    if (kind === 'focus') {
      voice(523.25, 0.0, 0.30, 0.20); // C5
      voice(659.25, 0.12, 0.30, 0.20); // E5
      voice(783.99, 0.24, 0.40, 0.22); // G5
    } else if (kind === 'break') {
      voice(440.00, 0.0, 0.45, 0.16, 'triangle'); // A4
      voice(329.63, 0.24, 0.55, 0.16, 'triangle'); // E4
    } else {
      // Sustained C-major chord (C5+E5+G5) with a high C6 bell on top.
      voice(523.25, 0.0, 0.70, 0.18); // C5
      voice(659.25, 0.0, 0.70, 0.16); // E5
      voice(783.99, 0.0, 0.70, 0.16); // G5
      voice(1046.50, 0.06, 0.80, 0.20); // C6 bell
    }
    setTimeout(() => { ctx.close().catch(() => {}); }, 2000);
  } catch {
    /* no-op */
  }
}