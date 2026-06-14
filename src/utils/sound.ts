// Procedural retro sound generator using Web Audio API (Offline-friendly, no external audio assets needed!)

class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private musicInterval: any = null;
  private currentStep = 0;
  private isMusicPlaying = false;
  private masterGain: GainNode | null = null;
  private effectsVolume = 0.5;
  private musicVolume = 0.3;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(generalVolume: number) {
    this.effectsVolume = generalVolume;
    this.musicVolume = generalVolume * 0.4;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(generalVolume, this.ctx.currentTime);
    }
  }

  playJump() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
      
      gain.gain.setValueAtTime(this.effectsVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      
      osc.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }
      
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  playDoubleJump() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.2);
      
      // Let's add a bandpass filter to make it sound laser-like
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, t);
      filter.frequency.exponentialRampToValueAtTime(1500, t + 0.2);
      
      gain.gain.setValueAtTime(this.effectsVolume * 0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      
      osc.connect(filter);
      filter.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }
      
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) {
      console.warn(e);
    }
  }

  playPerfectJump(percent: number = 1) {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      // Ascent pitch based on consecutive streak / multiplier value
      const startFreq = 440 + (percent - 1) * 80;
      const endFreq = 880 + (percent - 1) * 160;
      
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.18);
      
      gain.gain.setValueAtTime(this.effectsVolume * 0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      
      osc.connect(gain);
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }
      
      osc.start(t);
      osc.stop(t + 0.18);
    } catch (e) {
      console.warn(e);
    }
  }

  playCoin() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Retro double-ping coin sound
      osc1.frequency.setValueAtTime(987.77, t); // B5
      osc1.frequency.setValueAtTime(1318.51, t + 0.08); // E6
      
      osc2.frequency.setValueAtTime(1318.51 * 1.5, t); // high harmonic
      osc2.frequency.setValueAtTime(1318.51 * 1.5, t + 0.08);
      
      gain.gain.setValueAtTime(this.effectsVolume * 0.7, t);
      gain.gain.setValueAtTime(this.effectsVolume * 0.7, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      osc1.connect(gain);
      osc2.connect(gain);
      
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }
      
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.35);
      osc2.stop(t + 0.35);
    } catch (e) {
      console.warn(e);
    }
  }

  playHit() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lowpass = this.ctx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(30, t + 0.25);
      
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(500, t);
      lowpass.frequency.linearRampToValueAtTime(100, t + 0.25);
      
      gain.gain.setValueAtTime(this.effectsVolume * 1.2, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
      
      osc.connect(lowpass);
      lowpass.connect(gain);
      
      if (this.masterGain) {
        gain.connect(this.masterGain);
      } else {
        gain.connect(this.ctx.destination);
      }
      
      osc.start(t);
      osc.stop(t + 0.3);
    } catch (e) {
      console.warn(e);
    }
  }

  playGameOver() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Melancholy descending 8-bit scale
      const notes = [392.00, 349.23, 311.13, 261.63, 196.00]; // G4, F4, Eb4, C4, G3
      const noteDuration = 0.12;
      
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + index * noteDuration);
        
        gain.gain.setValueAtTime(this.effectsVolume * 0.6, t + index * noteDuration);
        gain.gain.linearRampToValueAtTime(0.01, t + (index + 0.95) * noteDuration);
        
        osc.connect(gain);
        if (this.masterGain) {
          gain.connect(this.masterGain);
        } else {
          gain.connect(this.ctx!.destination);
        }
        
        osc.start(t + index * noteDuration);
        osc.stop(t + (index + 1) * noteDuration);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  playAchievement() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Happy ascending custom major arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const noteDelay = 0.08;
      
      notes.forEach((freq, index) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + index * noteDelay);
        
        gain.gain.setValueAtTime(this.effectsVolume * 0.7, t + index * noteDelay);
        gain.gain.exponentialRampToValueAtTime(0.01, t + index * noteDelay + 0.25);
        
        osc.connect(gain);
        if (this.masterGain) {
          gain.connect(this.masterGain);
        } else {
          gain.connect(this.ctx!.destination);
        }
        
        osc.start(t + index * noteDelay);
        osc.stop(t + index * noteDelay + 0.3);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  startMusic() {
    if (this.isMusicPlaying) return;
    try {
      this.initCtx();
      this.isMusicPlaying = true;
      this.currentStep = 0;
      
      const tempo = 135; // BPM
      const stepDuration = 60 / tempo / 2; // Eighth notes
      
      // Chiptune bassline loop
      const melody = [
        110.00, 110.00, 165.00, 110.00, 130.81, 130.81, 196.00, 130.81, // A2 x2, E3, A2, C3 x2, G3, C3
        146.83, 146.83, 220.00, 146.83, 165.00, 196.00, 220.00, 165.00, // D3 x2, A3, D3, E3, G3, A3, E3
      ];
      
      const playStep = () => {
        if (!this.isMusicPlaying || !this.ctx) return;
        const t = this.ctx.currentTime;
        
        const note = melody[this.currentStep % melody.length];
        
        // Dynamic volume or skip certain beats to add syncopation
        const playPercussion = (this.currentStep % 4 === 2);
        const playArp = (this.currentStep % 8 === 4 || this.currentStep % 8 === 7);
        
        // 1. Bassline play
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, t);
        
        gain.gain.setValueAtTime(this.musicVolume * 0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + stepDuration * 0.9);
        
        osc.connect(gain);
        if (this.masterGain) {
          gain.connect(this.masterGain);
        } else {
          gain.connect(this.ctx.destination);
        }
        
        osc.start(t);
        osc.stop(t + stepDuration);
        
        // 2. High retro high arpeggio layer/beat occasionally
        if (playArp) {
          const arpOsc = this.ctx.createOscillator();
          const arpGain = this.ctx.createGain();
          
          arpOsc.type = 'sine';
          // Harmonics or arpeggiating up an octave or fifth
          arpOsc.frequency.setValueAtTime(note * 4, t);
          arpOsc.frequency.exponentialRampToValueAtTime(note * 6, t + stepDuration * 0.5);
          
          arpGain.gain.setValueAtTime(this.musicVolume * 0.25, t);
          arpGain.gain.exponentialRampToValueAtTime(0.01, t + stepDuration * 0.8);
          
          arpOsc.connect(arpGain);
          if (this.masterGain) {
            arpGain.connect(this.masterGain);
          } else {
            arpGain.connect(this.ctx.destination);
          }
          
          arpOsc.start(t);
          arpOsc.stop(t + stepDuration);
        }
        
        // 3. Simulating snare/hat with white noise (synthetic snips)
        if (playPercussion) {
          const noiseOsc = this.ctx.createOscillator();
          const noiseGain = this.ctx.createGain();
          
          noiseOsc.type = 'sawtooth';
          noiseOsc.frequency.setValueAtTime(80 + Math.random() * 40, t);
          
          const noiseFilter = this.ctx.createBiquadFilter();
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(1000, t);
          scaleFreqRamp(noiseFilter, 200, t + 0.05);
          
          noiseGain.gain.setValueAtTime(this.musicVolume * 0.15, t);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);
          
          noiseOsc.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          
          if (this.masterGain) {
            noiseGain.connect(this.masterGain);
          } else {
            noiseGain.connect(this.ctx.destination);
          }
          
          noiseOsc.start(t);
          noiseOsc.stop(t + 0.08);
        }
        
        this.currentStep++;
        
        // Next step coordination
        const nextTime = (stepDuration * 1000) - 10; // offset a tiny bit to avoid drifting
        this.musicInterval = setTimeout(playStep, nextTime);
      };
      
      playStep();
    } catch (e) {
      console.warn('Music playback error:', e);
    }
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

// Support robust parameter wrapping for Safari/Older types
function scaleFreqRamp(filter: BiquadFilterNode, target: number, endTime: number) {
  try {
    filter.frequency.exponentialRampToValueAtTime(target, endTime);
  } catch (e) {
    filter.frequency.setValueAtTime(target, endTime);
  }
}

export const sound = new RetroSoundEngine();
export default sound;
