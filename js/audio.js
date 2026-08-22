/* =========================================================================
   audio.js — WebAudio: generative pentatonic music, ambience, SFX
   ========================================================================= */
"use strict";

const AudioSys = (() => {
  let ctx = null, master, musicG, ambG, sfxG;
  let started = false;
  let muted = localStorage.getItem("inaka_muted") === "1";
  let noiseBuf = null;

  // F major pentatonic (midi): F G A C D
  const PENTA = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86];
  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const PROG = {
    day: [[65, 70, 62, 67], [65, 67, 70, 72]],
    night: [[62, 67, 65, 70], [65, 62, 67, 67]],
  };

  const music = {
    timer: null, nextT: 0, beat: 0, bar: 0, progIx: 0,
    mood: { season: "spring", night: false, festival: false, rain: false },
  };

  const amb = {
    rainSrc: null, rainG: null,
    streamG: null,
    cicadaG: null, cicadaOsc: null, cicadaLfo: null,
    windG: null,
    nextCricket: 0, nextCicadaBurst: 0,
  };

  // ---------- core ----------
  function init() {
    if (started) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ctx.destination);
      musicG = ctx.createGain(); musicG.gain.value = 0.3; musicG.connect(master);
      ambG = ctx.createGain(); ambG.gain.value = 0.22; ambG.connect(master);
      sfxG = ctx.createGain(); sfxG.gain.value = 0.5; sfxG.connect(master);

      // noise buffer (2s white)
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      startAmbience();
      startMusic();
      started = true;
    } catch (e) { console.warn("audio init failed", e); }
  }

  function setMuted(m) {
    muted = m;
    localStorage.setItem("inaka_muted", m ? "1" : "0");
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.6, ctx.currentTime, 0.05);
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  // ---------- synths ----------
  function pluck(freq, t, vol = 0.5, decay = 0.7, dest = musicG) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq * 1.012, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + decay + 0.05);
    // shimmer partial
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "sine"; o2.frequency.value = freq * 2;
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(vol * 0.3, t + 0.004);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + decay * 0.5);
    o2.connect(g2); g2.connect(dest);
    o2.start(t); o2.stop(t + decay);
  }

  function musicBox(freq, t, vol = 0.4, dest = musicG) {
    if (!ctx) return;
    for (const [mult, v, dec] of [[1, 1, 1.1], [3, 0.25, 0.5], [4, 0.12, 0.3]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dec + 0.05);
    }
  }

  function pad(freqs, t, dur, vol = 0.05, dest = musicG) {
    if (!ctx) return;
    for (const f of freqs) {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = f; o.detune.value = det;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g); g.connect(dest);
        o.start(t); o.stop(t + dur + 0.1);
      }
    }
  }

  function noiseBurst(t, dur, filterFreq, vol = 0.3, type = "lowpass", dest = sfxG) {
    if (!ctx || !noiseBuf) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t); src.stop(t + dur + 0.1);
  }

  function blip(freq, t, dur = 0.12, vol = 0.3, type = "square", slide = 0, dest = sfxG) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- music sequencer ----------
  function startMusic() {
    music.nextT = ctx.currentTime + 0.2;
    music.timer = setInterval(schedule, 40);
  }

  function schedule() {
    if (!ctx) return;
    const m = music.mood;
    const beatDur = m.festival ? 0.5 : m.night ? 0.95 : 0.75;
    while (music.nextT < ctx.currentTime + 0.25) {
      playBeat(music.nextT, beatDur, m);
      music.nextT += beatDur;
      music.beat++;
      if (music.beat >= 4) { music.beat = 0; music.bar++; }
    }
  }

  function playBeat(t, bd, m) {
    const rnd = Math.random;
    const progs = m.night ? PROG.night : PROG.day;
    const root = progs[music.progIx % 2][music.bar % 4];
    if (music.beat === 0 && music.bar % 4 === 0) music.progIx = (music.progIx + (rnd() < 0.5 ? 1 : 0));

    // bass on beat 0 (and softly on 2)
    if (music.beat === 0) pluck(midiHz(root - 24), t, m.night ? 0.3 : 0.4, 1.2);
    if (music.beat === 2 && rnd() < 0.5) pluck(midiHz(root - 24), t, 0.18, 0.8);

    // arpeggio pluck
    const density = m.night ? 0.45 : m.festival ? 0.9 : 0.7;
    if (rnd() < density) {
      const ix = Math.floor(rnd() * 4);
      const note = root + [0, 7, 12, 16][ix] % 24 + 12 * (rnd() < 0.3 ? 1 : 0);
      const f = midiHz(PENTA.includes(note) ? note : root + 12);
      pluck(f, t + bd * 0.5 * (rnd() < 0.3 ? 1 : 0), m.night ? 0.25 : 0.35, 0.9);
    }

    // melody
    if (!m.night && rnd() < 0.38) {
      const mi = 4 + Math.floor(rnd() * 5);
      const f = midiHz(PENTA[mi]);
      if (m.season === "spring") musicBox(f, t, 0.22);
      else pluck(f, t, 0.3, 1.3);
      if (rnd() < 0.4) pluck(midiHz(PENTA[Math.max(0, mi - 2)]), t + bd * 0.5, 0.2, 1.0);
    }

    // night pad every bar
    if (m.night && music.beat === 0) {
      pad([midiHz(root), midiHz(root + 7), midiHz(root + 12)], t, bd * 4, 0.045);
    }
    // festival drums
    if (m.festival) {
      if (music.beat === 0 || music.beat === 2) noiseBurst(t, 0.09, 300, 0.16, "lowpass", musicG);
      if (music.beat === 1 || music.beat === 3) blip(190, t, 0.05, 0.08, "sine", -60, musicG);
    }
  }

  function setMood(m) { Object.assign(music.mood, m); }

  // ---------- ambience ----------
  function startAmbience() {
    // rain loop (gain 0 until it rains)
    const rainSrc = ctx.createBufferSource(); rainSrc.buffer = noiseBuf; rainSrc.loop = true;
    const rainF = ctx.createBiquadFilter(); rainF.type = "lowpass"; rainF.frequency.value = 1400;
    amb.rainG = ctx.createGain(); amb.rainG.gain.value = 0;
    rainSrc.connect(rainF); rainF.connect(amb.rainG); amb.rainG.connect(ambG);
    rainSrc.start();
    amb.rainSrc = rainSrc;

    // stream loop (bandpass, gain by proximity)
    const stSrc = ctx.createBufferSource(); stSrc.buffer = noiseBuf; stSrc.loop = true;
    stSrc.playbackRate.value = 0.8;
    const stF = ctx.createBiquadFilter(); stF.type = "bandpass"; stF.frequency.value = 900; stF.Q.value = 0.6;
    amb.streamG = ctx.createGain(); amb.streamG.gain.value = 0;
    stSrc.connect(stF); stF.connect(amb.streamG); amb.streamG.connect(ambG);
    stSrc.start();

    // cicada: amplitude-gated buzzer
    amb.cicadaOsc = ctx.createOscillator(); amb.cicadaOsc.type = "sawtooth"; amb.cicadaOsc.frequency.value = 4200;
    const cF = ctx.createBiquadFilter(); cF.type = "bandpass"; cF.frequency.value = 4200; cF.Q.value = 8;
    amb.cicadaG = ctx.createGain(); amb.cicadaG.gain.value = 0;
    amb.cicadaLfo = ctx.createOscillator(); amb.cicadaLfo.type = "square"; amb.cicadaLfo.frequency.value = 9;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
    amb.cicadaLfo.connect(lfoG);
    const cGate = ctx.createGain(); cGate.gain.value = 0.5;
    lfoG.connect(cGate.gain);
    amb.cicadaOsc.connect(cF); cF.connect(cGate); cGate.connect(amb.cicadaG); amb.cicadaG.connect(ambG);
    amb.cicadaOsc.start(); amb.cicadaLfo.start();

    // wind
    const wSrc = ctx.createBufferSource(); wSrc.buffer = noiseBuf; wSrc.loop = true; wSrc.playbackRate.value = 0.3;
    const wF = ctx.createBiquadFilter(); wF.type = "lowpass"; wF.frequency.value = 400;
    amb.windG = ctx.createGain(); amb.windG.gain.value = 0.012;
    wSrc.connect(wF); wF.connect(amb.windG); amb.windG.connect(ambG);
    wSrc.start();
  }

  // called each ~0.5s by game with environmental state
  function updateEnv(e) {
    if (!ctx || !started) return;
    const T = ctx.currentTime;
    const ramp = (p, v) => p.setTargetAtTime(v, T, 0.8);
    ramp(amb.rainG.gain, e.rain ? (e.snow ? 0.0 : 0.16) : 0);
    ramp(amb.streamG.gain, 0.05 + Math.min(0.14, e.waterProx * 0.14));
    const wantCicada = e.season === "summer" && !e.night && !e.rain;
    ramp(amb.cicadaG.gain, wantCicada ? 0.05 * (0.7 + 0.3 * Math.sin(T * 0.13)) : 0);

    // crickets chirp periodically at night (not winter)
    if (e.night && !e.rain && e.season !== "winter" && T > amb.nextCricket) {
      amb.nextCricket = T + 0.8 + Math.random() * 2.2;
      for (let i = 0; i < 3; i++) {
        blip(4300 + Math.random() * 400, T + i * 0.09, 0.05, 0.045, "sine", 0, ambG);
      }
    }
  }

  // ---------- SFX ----------
  const sfx = {
    blip: () => ctx && blip(660, ctx.currentTime, 0.06, 0.15, "square", 200),
    confirm: () => { if (!ctx) return; const t = ctx.currentTime; blip(520, t, 0.07, 0.2, "square", 140); blip(780, t + 0.07, 0.09, 0.2, "square", 160); },
    cancel: () => ctx && blip(330, ctx.currentTime, 0.12, 0.2, "square", -120),
    pop: () => ctx && blip(880, ctx.currentTime, 0.07, 0.25, "sine", 500),
    heart: () => { if (!ctx) return; const t = ctx.currentTime; blip(700, t, 0.08, 0.2, "sine", 300); blip(1050, t + 0.09, 0.12, 0.2, "sine", 250); },
    coin: () => { if (!ctx) return; const t = ctx.currentTime; blip(988, t, 0.06, 0.25, "square", 0); blip(1319, t + 0.06, 0.18, 0.25, "square", 0); },
    sell: () => { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 3; i++) blip(880 + i * 220, t + i * 0.05, 0.1, 0.2, "square"); },
    eat: () => { if (!ctx) return; const t = ctx.currentTime; noiseBurst(t, 0.08, 800, 0.2); blip(300, t + 0.06, 0.08, 0.15, "sine", -80); },
    water: () => ctx && noiseBurst(ctx.currentTime, 0.25, 900, 0.22),
    splash: () => { if (!ctx) return; const t = ctx.currentTime; noiseBurst(t, 0.3, 1200, 0.3); blip(200, t, 0.15, 0.15, "sine", -120); },
    catchJingle: () => { if (!ctx) return; const t = ctx.currentTime; [72, 76, 79, 84].forEach((m, i) => musicBox(midiHz(m), t + i * 0.09, 0.3)); },
    fanfare: () => { if (!ctx) return; const t = ctx.currentTime; [65, 69, 72, 77, 84].forEach((m, i) => pluck(midiHz(m), t + i * 0.11, 0.35, 1.0)); },
    bell: () => { if (!ctx) return; const t = ctx.currentTime; for (const [f, v, d] of [[523, 0.3, 2.2], [1046, 0.15, 1.6], [1571, 0.06, 1.0]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + d); } },
    horn: () => { if (!ctx) return; const t = ctx.currentTime; for (const det of [0, 3]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = 311; o.detune.value = det * 20; const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.05); g.gain.setValueAtTime(0.14, t + 0.5); g.gain.linearRampToValueAtTime(0, t + 0.8); o.connect(f); f.connect(g); g.connect(sfxG); o.start(t); o.stop(t + 0.85); } },
    trainRumble: (vol) => { if (!ctx) return; noiseBurst(ctx.currentTime, 0.4, 200, Math.max(0.02, vol), "lowpass", ambG); },
    meow: () => { if (!ctx) return; const t = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.setValueAtTime(760, t); o.frequency.linearRampToValueAtTime(520, t + 0.22); const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 2200; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26); o.connect(f); f.connect(g); g.connect(sfxG); o.start(t); o.stop(t + 0.3); },
    woof: () => { if (!ctx) return; const t = ctx.currentTime; blip(340, t, 0.07, 0.18, "square", -160); blip(300, t + 0.12, 0.09, 0.15, "square", -140); },
    purr: () => { if (!ctx) return; const t = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sawtooth"; o.frequency.value = 55; const lfo = ctx.createOscillator(); lfo.frequency.value = 24; const lg = ctx.createGain(); lg.gain.value = 0.06; lfo.connect(lg); lg.connect(g.gain); g.gain.value = 0.08; const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 300; o.connect(f); f.connect(g); g.connect(sfxG); o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6); g.gain.setTargetAtTime(0, t + 0.35, 0.08); },
    cluck: () => ctx && blip(900, ctx.currentTime, 0.06, 0.1, "square", -300),
    kyu: () => { if (!ctx) return; const t = ctx.currentTime; blip(1200, t, 0.1, 0.12, "sine", -350); blip(900, t + 0.12, 0.12, 0.1, "sine", -250); },
    clunk: () => { if (!ctx) return; const t = ctx.currentTime; blip(140, t, 0.15, 0.3, "sine", -60); noiseBurst(t + 0.1, 0.1, 500, 0.15); },
    chop: () => { if (!ctx) return; const t = ctx.currentTime; noiseBurst(t, 0.12, 600, 0.25); blip(180, t, 0.08, 0.15, "triangle", -60); },
    boom: (delay = 0) => { if (!ctx) return; const t = ctx.currentTime + delay; noiseBurst(t, 0.7, 250, 0.4); blip(70, t, 0.5, 0.3, "sine", -30); noiseBurst(t + 0.15, 0.5, 3000, 0.1, "highpass"); },
    sparkle: () => { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 4; i++) blip(1200 + i * 300, t + i * 0.04, 0.1, 0.08, "sine", 100); },
    doorKnock: () => ctx && noiseBurst(ctx.currentTime, 0.09, 400, 0.2),
    sleep: () => { if (!ctx) return; const t = ctx.currentTime; musicBox(midiHz(77), t, 0.25); musicBox(midiHz(72), t + 0.3, 0.25); musicBox(midiHz(65), t + 0.6, 0.25); },
  };

  return { init, toggleMute, isMuted, setMuted, setMood, updateEnv, sfx,
    get started() { return started; } };
})();
