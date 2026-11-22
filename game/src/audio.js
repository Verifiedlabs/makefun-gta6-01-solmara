import { RADIO_STATIONS } from './config.js';

export function createAudioEngine() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let stationIndex = 0;
  let beatAccum = 0;
  let stepIndex = 0;

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    try {
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.34;
      master.connect(ctx.destination);

      // Engine RPM oscillator
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 240;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter).connect(engineGain).connect(master);
      engineOsc.start();

      // Wailing SBPD siren oscillator
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 660;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function playTone(freq, duration, type = 'sine', vol = 0.2, slideTo = null) {
    if (muted || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playNoise(duration, vol = 0.25, cutoff = 1200) {
    if (muted || !ctx || ctx.state !== 'running') return;
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleCount * 0.35));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(master);
    src.start();
  }

  return {
    unlock() {
      ensureContext();
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.34;
      return muted;
    },
    getStation() {
      return RADIO_STATIONS[stationIndex];
    },
    cycleRadio() {
      stationIndex = (stationIndex + 1) % RADIO_STATIONS.length;
      stepIndex = 0;
      beatAccum = 0;
      this.playChime(520, 680);
      return RADIO_STATIONS[stationIndex];
    },
    playGunshot(weaponId = 'sidearm', volScale = 1) {
      if (!ctx || ctx.state !== 'running' || muted) return;
      if (weaponId === 'shotgun') {
        playNoise(0.22, 0.42 * volScale, 900);
        playTone(130, 0.16, 'sawtooth', 0.28 * volScale, 42);
      } else if (weaponId === 'smg') {
        playNoise(0.075, 0.24 * volScale, 2100);
        playTone(230, 0.06, 'square', 0.12 * volScale, 85);
      } else if (weaponId === 'brawl') {
        playTone(160, 0.09, 'triangle', 0.2 * volScale, 65);
      } else {
        playNoise(0.11, 0.3 * volScale, 1600);
        playTone(190, 0.09, 'sawtooth', 0.16 * volScale, 65);
      }
    },
    playExplosion() {
      playNoise(0.65, 0.6, 480);
      playTone(95, 0.52, 'sawtooth', 0.38, 26);
    },
    playChime(f1 = 587, f2 = 880) {
      playTone(f1, 0.14, 'triangle', 0.22);
      setTimeout(() => playTone(f2, 0.22, 'triangle', 0.24), 95);
    },
    update(dt, elapsed, player, police, inGameplay) {
      if (!ctx || ctx.state !== 'running' || muted || !inGameplay) {
        if (engineGain) engineGain.gain.value = 0;
        if (sirenGain) sirenGain.gain.value = 0;
        return;
      }

      // Engine RPM synth
      if (player.vehicle) {
        const speedNorm = Math.min(1.3, player.vehicle.speed / player.vehicle.spec.maxSpeed);
        engineOsc.frequency.setTargetAtTime(52 + speedNorm * 128 + (player.vehicle.nitroActive ? 35 : 0), ctx.currentTime, 0.05);
        engineGain.gain.setTargetAtTime(0.07 + speedNorm * 0.09, ctx.currentTime, 0.08);
      } else {
        engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      }

      // Police siren wail
      if (police.wantedLevel > 0) {
        const wail = 640 + Math.sin(elapsed * 5.8) * 210;
        sirenOsc.frequency.setTargetAtTime(wail, ctx.currentTime, 0.04);
        sirenGain.gain.setTargetAtTime(0.055, ctx.currentTime, 0.1);
      } else {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      }

      // Procedural coastal synthwave FM radio step sequencer
      const station = RADIO_STATIONS[stationIndex];
      if (station.bpm > 0 && player.vehicle) {
        const stepDur = 60 / station.bpm / 2;
        beatAccum += dt;
        if (beatAccum >= stepDur) {
          beatAccum -= stepDur;
          const bFreq = station.bassNotes[stepIndex % station.bassNotes.length];
          const lFreq = station.leadNotes[stepIndex % station.leadNotes.length];
          playTone(bFreq, stepDur * 0.85, 'sawtooth', 0.065);
          if (stepIndex % 2 === 0) {
            playTone(lFreq, stepDur * 0.9, station.wave, 0.045);
          }
          stepIndex++;
        }
      }
    },
  };
}
