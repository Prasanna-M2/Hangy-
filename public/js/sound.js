// sound.js - Procedural Web Audio Synthesizer for Charm Materials
// bell, glass, metal, wood, soft

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.7;
    this.lastPlayTime = 0;
    this.minInterval = 85; // ms cooldown between clacks
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(soundType, velocity = 1.0) {
    if (!this.enabled || velocity < 0.08) return;
    this.init();
    if (!this.ctx) return;

    const now = performance.now();
    if (now - this.lastPlayTime < this.minInterval) return;
    this.lastPlayTime = now;

    const intensity = Math.min(1.0, Math.max(0.1, velocity));
    const gain = this.volume * intensity;

    switch (soundType) {
      case 'bell':
        this.playBell(gain);
        break;
      case 'glass':
        this.playGlass(gain);
        break;
      case 'metal':
        this.playMetal(gain);
        break;
      case 'wood':
        this.playWood(gain);
        break;
      case 'soft':
      default:
        this.playSoft(gain);
        break;
    }
  }

  playBell(gainVal) {
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, t); // C6
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2093.0, t); // C7 harmonic

    gain.gain.setValueAtTime(gainVal * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.2);
    osc2.stop(t + 1.2);
  }

  playGlass(gainVal) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.15);

    gain.gain.setValueAtTime(gainVal * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  playMetal(gainVal) {
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(820, t);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1645, t);

    gain.gain.setValueAtTime(gainVal * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.5);
    osc2.stop(t + 0.5);
  }

  playWood(gainVal) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);

    gain.gain.setValueAtTime(gainVal * 0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  playSoft(gainVal) {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.12);

    gain.gain.setValueAtTime(gainVal * 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SoundEngine };
} else {
  window.SoundEngine = SoundEngine;
}
