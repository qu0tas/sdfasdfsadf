// All sound is synthesised with the Web Audio API: short effects and a quiet generative lullaby.
// There are no audio files to load.

const SCALES = {
  roots: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66], // D minor pentatonic-ish, low and earthy
  toys: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25], // C major pentatonic, a music box
  heart: [233.08, 277.18, 311.13, 349.23, 415.3, 466.16], // B-flat minor, uneasy
  title: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0],
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.volumes = { master: 0.8, music: 0.6, sfx: 0.8 };
    this.mood = 'title';
    this.tense = false;
    this.nextNote = 0;
    this.timer = null;
  }

  /** Browsers only allow sound after a click or key press, so this is called from the first input. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
    this.nextNote = this.ctx.currentTime + 0.3;
    this.timer = setInterval(() => this.schedule(), 200);
  }

  setVolumes(volumes) {
    Object.assign(this.volumes, volumes);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.musicBus.gain.value = this.volumes.music * 0.5;
    this.sfxBus.gain.value = this.volumes.sfx * 0.6;
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    this.ctx?.resume();
  }

  /** @param {string} mood key of SCALES; @param {boolean} tense faster, lower notes for boss fights */
  setMood(mood, tense = false) {
    this.mood = SCALES[mood] ? mood : 'title';
    this.tense = tense;
  }

  tone(bus, { freq, to = freq, type = 'sine', time = 0.15, gain = 0.2, at = 0, attack = 0.005 }) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + time);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.linearRampToValueAtTime(gain, t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + time);
    osc.connect(amp).connect(bus);
    osc.start(t);
    osc.stop(t + time + 0.02);
  }

  noise({ time = 0.2, gain = 0.2, freq = 1200, to = freq, at = 0 }) {
    const t = this.ctx.currentTime + at;
    const length = Math.ceil(this.ctx.sampleRate * time);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + time);
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + time);
    src.connect(filter).connect(amp).connect(this.sfxBus);
    src.start(t);
  }

  /** Plays a named effect. Unknown names are reported once in the console. */
  sfx(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const s = (options) => this.tone(this.sfxBus, options);
    switch (name) {
      case 'shoot': s({ freq: 620 + Math.random() * 80, to: 380, type: 'triangle', time: 0.08, gain: 0.12 }); break;
      case 'chord': s({ freq: 392, time: 0.3, gain: 0.14 }); s({ freq: 587, time: 0.3, gain: 0.1 }); break;
      case 'pop': s({ freq: 300, to: 160, time: 0.06, gain: 0.08 }); break;
      case 'enemyHit': s({ freq: 210, to: 140, type: 'square', time: 0.06, gain: 0.07 }); break;
      case 'enemyDie': s({ freq: 320, to: 70, type: 'triangle', time: 0.25, gain: 0.16 }); this.noise({ time: 0.18, gain: 0.08, freq: 900, to: 200 }); break;
      case 'enemyShot': s({ freq: 240, to: 170, type: 'sawtooth', time: 0.1, gain: 0.05 }); break;
      case 'hurt': s({ freq: 180, to: 60, type: 'sawtooth', time: 0.3, gain: 0.2 }); this.noise({ time: 0.2, gain: 0.12, freq: 700, to: 150 }); break;
      case 'glass': s({ freq: 1900, to: 900, type: 'triangle', time: 0.25, gain: 0.14 }); s({ freq: 2500, to: 1300, type: 'triangle', time: 0.2, gain: 0.1, at: 0.04 }); break;
      case 'fill': s({ freq: 660, to: 1320, time: 0.4, gain: 0.14 }); break;
      case 'dash': this.noise({ time: 0.14, gain: 0.1, freq: 2400, to: 500 }); break;
      case 'dust': s({ freq: 1250 + Math.random() * 300, time: 0.07, gain: 0.08 }); break;
      case 'pickup': s({ freq: 700, to: 1050, time: 0.12, gain: 0.12 }); break;
      case 'heart': s({ freq: 440, time: 0.12, gain: 0.14 }); s({ freq: 660, time: 0.18, gain: 0.14, at: 0.09 }); break;
      case 'item': [523, 659, 784, 1047].forEach((freq, i) => s({ freq, time: 0.35, gain: 0.12, at: i * 0.09 })); break;
      case 'synergy': [392, 523, 659, 784, 1047, 1319].forEach((freq, i) => s({ freq, type: 'triangle', time: 0.4, gain: 0.1, at: i * 0.06 })); break;
      case 'buy': s({ freq: 880, time: 0.08, gain: 0.12 }); s({ freq: 1175, time: 0.14, gain: 0.12, at: 0.07 }); break;
      case 'deny': s({ freq: 160, type: 'square', time: 0.12, gain: 0.08 }); break;
      case 'place': s({ freq: 140, to: 100, time: 0.1, gain: 0.15 }); break;
      case 'boom': this.noise({ time: 0.5, gain: 0.4, freq: 1800, to: 80 }); s({ freq: 90, to: 35, time: 0.45, gain: 0.3 }); break;
      case 'open': s({ freq: 330, to: 660, type: 'triangle', time: 0.3, gain: 0.1 }); break;
      case 'seal': s({ freq: 260, to: 110, type: 'triangle', time: 0.25, gain: 0.1 }); break;
      case 'unlock': s({ freq: 990, time: 0.08, gain: 0.12 }); s({ freq: 1480, time: 0.2, gain: 0.12, at: 0.08 }); break;
      case 'rift': this.noise({ time: 0.35, gain: 0.07, freq: 500, to: 2600 }); break;
      case 'plate': s({ freq: 523, time: 0.25, gain: 0.14 }); break;
      case 'wrong': s({ freq: 196, type: 'square', time: 0.3, gain: 0.09 }); s({ freq: 185, type: 'square', time: 0.3, gain: 0.09 }); break;
      case 'solve': [523, 659, 784, 1047, 1319].forEach((freq, i) => s({ freq, time: 0.5, gain: 0.12, at: i * 0.12 })); break;
      case 'use': s({ freq: 300, to: 900, type: 'triangle', time: 0.3, gain: 0.14 }); break;
      case 'freeze': s({ freq: 1800, to: 2600, time: 0.4, gain: 0.08 }); this.noise({ time: 0.3, gain: 0.05, freq: 5000, to: 3000 }); break;
      case 'charge': s({ freq: 880, time: 0.1, gain: 0.07 }); break;
      case 'telegraph': s({ freq: 150, to: 220, type: 'sawtooth', time: 0.3, gain: 0.07 }); break;
      case 'beam': s({ freq: 880, to: 220, type: 'sawtooth', time: 0.45, gain: 0.1 }); this.noise({ time: 0.4, gain: 0.08, freq: 3000, to: 800 }); break;
      case 'slam': this.noise({ time: 0.3, gain: 0.3, freq: 600, to: 60 }); s({ freq: 70, to: 40, time: 0.3, gain: 0.25 }); break;
      case 'bossDie': [392, 330, 262, 196, 131].forEach((freq, i) => s({ freq, type: 'triangle', time: 0.7, gain: 0.14, at: i * 0.22 })); break;
      case 'death': [330, 262, 196, 147, 98].forEach((freq, i) => s({ freq, time: 0.6, gain: 0.14, at: i * 0.2 })); break;
      case 'select': s({ freq: 660, time: 0.06, gain: 0.08 }); break;
      default: console.warn(`Unknown sound "${name}"`);
    }
  }

  /** Queues the lullaby a little ahead of time: sparse music-box notes over a slow drone. */
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const scale = SCALES[this.mood];
    while (this.nextNote < this.ctx.currentTime + 0.5) {
      const at = this.nextNote - this.ctx.currentTime;
      const freq = scale[Math.floor(Math.random() * scale.length)] * (this.tense ? 0.5 : Math.random() < 0.3 ? 2 : 1);
      this.tone(this.musicBus, { freq, type: this.tense ? 'triangle' : 'sine', time: this.tense ? 0.5 : 1.6, gain: 0.16, at, attack: 0.01 });
      if (Math.random() < 0.25) this.tone(this.musicBus, { freq: freq * 1.5, time: 1.4, gain: 0.07, at: at + 0.02 });
      if (Math.random() < 0.2) this.tone(this.musicBus, { freq: scale[0] / 2, time: 4, gain: 0.1, at, attack: 1.2 });
      const beat = this.tense ? 0.28 : 0.62;
      this.nextNote += beat * (Math.random() < 0.3 ? 2 : 1);
    }
  }
}
