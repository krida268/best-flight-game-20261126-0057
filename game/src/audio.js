// Synthesised sound for Sky Courier: Island Run.
// Everything is generated with the Web Audio API — no sound files, no
// network. The engine hum follows the throttle; rings chime, crashes thud.

export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 70;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, duration, type, volume) {
    if (!context || muted) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + duration);
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    setEngine(throttle, flying) {
      if (!context || muted) return;
      if (!engineOsc) return;
      engineOsc.frequency.value = 55 + throttle * 75;
      engineGain.gain.value = flying ? 0.045 + throttle * 0.03 : 0;
    },
    ring() {
      blip(880, 0.28, 'sine', 0.16);
      setTimeout(() => blip(1318, 0.32, 'sine', 0.14), 70);
    },
    miss() {
      blip(220, 0.2, 'triangle', 0.1);
    },
    crash() {
      if (!context || muted) return;
      const length = context.sampleRate * 0.5;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = 0.3;
      source.connect(gain);
      gain.connect(context.destination);
      source.start();
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
