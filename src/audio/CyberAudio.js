export default class CyberAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.ambient = null;
    this.master = null;
  }

  unlock() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.context.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  tone(frequency, duration = 0.08, type = 'sine', volume = 0.15, slide = 0) {
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  startAmbient() {
    if (!this.context || this.muted || this.ambient) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 55;
    gain.gain.value = 0.025;
    osc.connect(gain).connect(this.master);
    osc.start();
    this.ambient = { osc, gain };
  }

  stopAmbient() {
    if (!this.ambient) return;
    this.ambient.osc.stop();
    this.ambient = null;
  }

  setMuted(value) {
    this.muted = value;
    if (this.master) this.master.gain.value = value ? 0 : 0.18;
  }

  step() { this.tone(100, 0.04, 'square', 0.025, -18); }
  alert() { this.tone(280, 0.12, 'sawtooth', 0.08, 180); }
  pickup() { this.tone(430, 0.13, 'triangle', 0.12, 420); }
  rewind() { this.tone(480, 0.25, 'sawtooth', 0.11, -360); }
  win() { this.tone(380, 0.1, 'square', 0.1, 170); setTimeout(() => this.tone(740, 0.2, 'triangle', 0.1, 260), 115); }
}
