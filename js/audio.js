/**
 * Audio Synthesizer for Chess Sounds using Web Audio API
 * Generates realistic "thud" and "snap" sounds without needing external files.
 */

class ChessAudio {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.enabled = true;
  }

  // Ensures audio context is active (browsers block audio until user interaction)
  async init() {
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  /**
   * Synthesizes a standard move sound (a woody thud)
   */
  playMove() {
    if (!this.enabled) return;
    this.init();

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    // Rapid pitch drop to simulate a "thud" impact
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);

    // Volume envelope: sharp attack, quick decay
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.7, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Synthesizes a capture sound (a crisper snap/clack)
   */
  playCapture() {
    if (!this.enabled) return;
    this.init();

    const t = this.audioCtx.currentTime;
    
    // First oscillator: high pitched "clack"
    const osc1 = this.audioCtx.createOscillator();
    const gain1 = this.audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(400, t);
    osc1.frequency.exponentialRampToValueAtTime(100, t + 0.03);
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.8, t + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc1.connect(gain1);
    gain1.connect(this.audioCtx.destination);

    // Second oscillator: lower "thud" body of the sound
    const osc2 = this.audioCtx.createOscillator();
    const gain2 = this.audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(150, t);
    osc2.frequency.exponentialRampToValueAtTime(50, t + 0.08);
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.6, t + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc2.connect(gain2);
    gain2.connect(this.audioCtx.destination);

    // Noise burst for texture
    const bufferSize = this.audioCtx.sampleRate * 0.05; // 50ms of noise
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);

    osc1.start(t);
    osc2.start(t);
    noise.start(t);
    
    osc1.stop(t + 0.05);
    osc2.stop(t + 0.1);
  }
}

// Global instance
const chessAudio = new ChessAudio();
