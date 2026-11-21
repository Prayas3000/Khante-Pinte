// Web Audio API & HTML5 Audio based kitchen order chime
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Automatically unlock AudioContext on the user's first click or touch
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('kp_admin_sound_enabled');
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kp_admin_sound_enabled', enabled ? 'true' : 'false');
  if (enabled) {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }
}

/**
 * Synthesizes a loud, crisp, pleasant two-tone restaurant kitchen bell chime (880 Hz -> 1320 Hz)
 */
export function playNewOrderChime() {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => playOscillators(ctx)).catch(() => {});
      } else {
        playOscillators(ctx);
      }
    }
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
}

function playOscillators(ctx) {
  try {
    const now = ctx.currentTime;

    // Tone 1: High crisp ding (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Tone 2: Harmonic chime resolution (1318.5 Hz - E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.45, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.9);
  } catch (e) {
    console.warn('Oscillator node error:', e);
  }
}
