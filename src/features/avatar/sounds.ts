// Web Audio synth for the avatar picker: species-matched bird calls, tier
// stingers, and a golf-swing for the intro CTA. Ported from the prototype.
// All functions are no-ops until the user has interacted (audio needs a gesture).

let enabled = true;
export function setSoundEnabled(on: boolean) {
  enabled = on;
}
export function isSoundEnabled() {
  return enabled;
}

let actx: AudioContext | null = null;
function ac(): AudioContext {
  const AC =
    (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext) as typeof AudioContext;
  actx = actx || new AC();
  if (actx.state === "suspended") actx.resume();
  return actx;
}
function env(g: GainNode, t: number, peak: number, dur: number, atk?: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + (atk || 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

interface ToneOpts {
  f: number;
  f2?: number;
  dur?: number;
  type?: OscillatorType;
  peak?: number;
  atk?: number;
  vib?: number;
  vibDepth?: number;
  am?: number;
  amType?: OscillatorType;
  bend?: number;
  harm?: number[];
  harmGain?: number[];
}
function tone(t: number, o: ToneOpts) {
  const a = ac();
  const dur = o.dur || 0.18;
  const out = a.createGain();
  env(out, t, o.peak || 0.14, dur, o.atk);
  out.connect(a.destination);
  let node: AudioNode = out;
  if (o.am) {
    const trem = a.createGain();
    trem.gain.value = 0.6;
    trem.connect(out);
    const lfo = a.createOscillator();
    lfo.type = o.amType || "sine";
    lfo.frequency.value = o.am;
    const ld = a.createGain();
    ld.gain.value = 0.4;
    lfo.connect(ld);
    ld.connect(trem.gain);
    lfo.start(t);
    lfo.stop(t + dur);
    node = trem;
  }
  const harm = o.harm || [1];
  harm.forEach((ratio, i) => {
    const osc = a.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f * ratio, t);
    if (o.f2)
      osc.frequency.exponentialRampToValueAtTime(
        o.f2 * ratio,
        t + dur * (o.bend || 0.9)
      );
    if (o.vib) {
      const l = a.createOscillator();
      const lg = a.createGain();
      l.frequency.value = o.vib;
      lg.gain.value = (o.vibDepth || o.f * 0.05) * ratio;
      l.connect(lg);
      lg.connect(osc.frequency);
      l.start(t);
      l.stop(t + dur);
    }
    const pg = a.createGain();
    pg.gain.value = o.harmGain ? o.harmGain[i] : 1 / (i + 1);
    osc.connect(pg);
    pg.connect(node);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  });
}
interface NoiseOpts {
  f?: number;
  q?: number;
  dur?: number;
  peak?: number;
  atk?: number;
  type?: BiquadFilterType;
}
function noise(t: number, o: NoiseOpts) {
  const a = ac();
  const dur = o.dur || 0.12;
  const n = a.createBufferSource();
  const buf = a.createBuffer(1, Math.max(1, (a.sampleRate * dur) | 0), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  n.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = o.type || "bandpass";
  f.frequency.value = o.f || 1500;
  f.Q.value = o.q || 1;
  const g = a.createGain();
  env(g, t, o.peak || 0.1, dur, o.atk);
  n.connect(f);
  f.connect(g);
  g.connect(a.destination);
  n.start(t);
  n.stop(t + dur);
}

export function golfSwing() {
  if (!enabled) return;
  try {
    const a = ac();
    const t = a.currentTime + 0.02;
    const dur = 0.26;
    const n = a.createBufferSource();
    const buf = a.createBuffer(1, (a.sampleRate * dur) | 0, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(380, t);
    bp.frequency.exponentialRampToValueAtTime(1900, t + 0.16);
    bp.frequency.exponentialRampToValueAtTime(560, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.11);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp);
    bp.connect(g);
    g.connect(a.destination);
    n.start(t);
    n.stop(t + dur);
    const tk = t + 0.18;
    tone(tk, { f: 1500, f2: 650, dur: 0.05, peak: 0.24, type: "triangle" });
    noise(tk, { f: 2600, q: 2.2, dur: 0.03, peak: 0.18 });
  } catch {
    /* no-op */
  }
}

// golf-victory motifs for the legendary tier
function puttDrop(t: number) {
  [0, 0.07, 0.13].forEach((dt, i) =>
    tone(t + dt, { f: 1250 - i * 170, dur: 0.04, peak: 0.12, type: "triangle" })
  );
  tone(t + 0.2, { f: 300, f2: 150, dur: 0.12, peak: 0.16 });
  noise(t + 0.2, { f: 500, q: 1, dur: 0.06, peak: 0.05 });
}
function trophyFanfare(
  t: number,
  o: { root?: number; arp?: number[]; hold?: number; bass?: boolean }
) {
  const root = o.root || 523,
    arp = o.arp || [0, 4, 7, 12],
    hold = o.hold || 0.7;
  arp.forEach((s, i) =>
    tone(t + i * 0.08, {
      f: root * Math.pow(2, s / 12),
      dur: 0.16,
      peak: 0.13,
      type: "sawtooth",
      harm: [1, 2],
      harmGain: [1, 0.4],
    })
  );
  const ct = t + arp.length * 0.08;
  [0, 4, 7, 12].forEach((s) =>
    tone(ct, {
      f: root * Math.pow(2, s / 12),
      dur: hold,
      peak: 0.1,
      type: "sawtooth",
      harm: [1, 2],
      harmGain: [1, 0.35],
    })
  );
  if (o.bass) tone(ct, { f: root / 2, dur: hold, peak: 0.12, type: "sawtooth" });
  tone(ct + 0.05, {
    f: root * 4,
    dur: hold * 0.8,
    peak: 0.06,
    type: "triangle",
    vib: 9,
    vibDepth: 40,
  });
}

type Recipe = (t: number) => void;
const V: Record<string, Recipe> = {
  owl: (t) => {
    tone(t, { f: 330, f2: 300, dur: 0.26, peak: 0.16, harm: [1, 2], harmGain: [1, 0.25] });
    tone(t + 0.4, { f: 320, f2: 285, dur: 0.3, peak: 0.15, harm: [1, 2], harmGain: [1, 0.25] });
  },
  bluejay: (t) => {
    [0, 1].forEach((i) => tone(t + i * 0.2, { f: 1700, f2: 900, dur: 0.17, peak: 0.15, type: "sawtooth", am: 18 }));
  },
  cardinal: (t) => {
    tone(t, { f: 1300, f2: 3000, dur: 0.18, peak: 0.13 });
    [2600, 2600, 2600, 2600].forEach((f, i) => tone(t + 0.24 + i * 0.07, { f, f2: f * 0.85, dur: 0.05, peak: 0.11 }));
  },
  kingfisher: (t) => {
    for (let i = 0; i < 14; i++) tone(t + i * 0.03, { f: 3300, dur: 0.024, peak: 0.09, type: "square" });
  },
  robin: (t) => {
    [1900, 2500, 2100, 2700, 2200, 2600].forEach((f, i) => tone(t + i * 0.11, { f, f2: f * 1.25, dur: 0.1, peak: 0.11, vib: 20, vibDepth: 120 }));
  },
  woodpecker: (t) => {
    for (let i = 0; i < 11; i++) noise(t + i * 0.038, { f: 2000, q: 0.6, dur: 0.024, peak: 0.16 });
  },
  wren: (t) => {
    for (let i = 0; i < 18; i++) tone(t + i * 0.026, { f: 2800 + (i % 2 ? 700 : 0), dur: 0.022, peak: 0.07, vib: 30, vibDepth: 200 });
  },
  seagull: (t) => {
    [0, 1, 2, 3].forEach((i) => tone(t + i * 0.2, { f: 1500, f2: 850, dur: 0.16, peak: 0.14, type: "sawtooth", am: 14 }));
  },
  duckling: (t) => {
    [0, 1, 2].forEach((i) => tone(t + i * 0.1, { f: 2400, f2: 2000, dur: 0.06, peak: 0.12, type: "square" }));
  },
  pigeon: (t) => {
    tone(t, { f: 480, f2: 400, dur: 0.34, peak: 0.13, vib: 11, vibDepth: 34, harm: [1, 2], harmGain: [1, 0.2] });
    tone(t + 0.42, { f: 410, dur: 0.2, peak: 0.1 });
  },
  dodo: (t) => {
    tone(t, { f: 280, f2: 360, dur: 0.28, peak: 0.14, type: "triangle" });
    tone(t + 0.32, { f: 240, dur: 0.16, peak: 0.1, type: "triangle" });
  },
  flamingo: (t) => {
    [0, 1].forEach((i) => tone(t + i * 0.22, { f: 560, f2: 300, dur: 0.18, peak: 0.15, type: "sawtooth", am: 12, harm: [1, 2], harmGain: [1, 0.3] }));
  },
  eagle: (t) => {
    tone(t, { f: 2800, f2: 1300, dur: 0.5, peak: 0.16, type: "sawtooth", am: 30, harm: [1, 2, 3], harmGain: [1, 0.4, 0.2] });
    tone(t + 0.52, { f: 2400, f2: 1100, dur: 0.3, peak: 0.12, type: "sawtooth", am: 26, harm: [1, 2], harmGain: [1, 0.3] });
  },
  hawk: (t) => {
    tone(t, { f: 2500, f2: 1050, dur: 0.52, peak: 0.15, type: "sawtooth", am: 22, harm: [1, 2, 3], harmGain: [1, 0.4, 0.15] });
  },
  falcon: (t) => {
    for (let i = 0; i < 7; i++) tone(t + i * 0.075, { f: 1500, f2: 1100, dur: 0.045, peak: 0.13, type: "sawtooth" });
  },
  goldfinch: (t) => {
    for (let i = 0; i < 12; i++) tone(t + i * 0.05, { f: 3000 + Math.sin(i * 1.3) * 700, dur: 0.04, peak: 0.08, vib: 40, vibDepth: 200 });
  },
  crow: (t) => {
    // "cha-ching" cash register — Crow the Hustler
    tone(t, { f: 988, dur: 0.12, peak: 0.16, type: "triangle", harm: [1, 2, 3], harmGain: [1, 0.5, 0.25] });
    tone(t + 0.09, { f: 1319, dur: 0.2, peak: 0.16, type: "triangle", harm: [1, 2, 3], harmGain: [1, 0.5, 0.25] });
    for (let i = 0; i < 6; i++) tone(t + 0.2 + i * 0.028, { f: 2200 + Math.random() * 1100, dur: 0.05, peak: 0.05 });
    noise(t + 0.17, { f: 3200, q: 1.6, dur: 0.06, peak: 0.07 });
  },
  magpie: (t) => {
    for (let i = 0; i < 9; i++) {
      noise(t + i * 0.065, { f: 1700, q: 0.8, dur: 0.04, peak: 0.1 });
      tone(t + i * 0.065, { f: 900, dur: 0.04, peak: 0.06, type: "sawtooth" });
    }
  },
  heron: (t) => {
    noise(t, { f: 650, q: 0.4, dur: 0.36, peak: 0.18 });
    tone(t, { f: 300, f2: 230, dur: 0.36, peak: 0.1, type: "sawtooth", am: 24 });
  },
  rooster: (t) => {
    [440, 560, 680].forEach((f, i) => tone(t + i * 0.16, { f, f2: f * 1.05, dur: 0.15, peak: 0.15, type: "sawtooth", harm: [1, 2], harmGain: [1, 0.3] }));
    tone(t + 0.52, { f: 740, f2: 680, dur: 0.34, peak: 0.16, type: "sawtooth", vib: 9, vibDepth: 30, harm: [1, 2], harmGain: [1, 0.35] });
  },
  albatross: (t) => {
    puttDrop(t);
    trophyFanfare(t + 0.36, { root: 523, arp: [0, 4, 7, 12], hold: 0.85, bass: true });
  },
  condor: (t) => {
    puttDrop(t);
    trophyFanfare(t + 0.36, { root: 392, arp: [0, 5, 7, 12, 16], hold: 1.0, bass: true });
  },
  swift: (t) => {
    puttDrop(t);
    trophyFanfare(t + 0.34, { root: 659, arp: [0, 4, 7, 11, 12], hold: 0.65 });
  },
  penguin: (t) => {
    [0, 1, 2].forEach((i) => {
      noise(t + i * 0.22, { f: 520 + i * 90, q: 0.5, dur: 0.18, peak: 0.16 });
      tone(t + i * 0.22, { f: 300 + i * 40, f2: 200, dur: 0.18, peak: 0.1, type: "sawtooth", am: 20 });
    });
  },
  turkey: (t) => {
    for (let i = 0; i < 14; i++) tone(t + i * 0.045, { f: 520 + (i % 2 ? 280 : 0), dur: 0.04, peak: 0.12, type: "sawtooth", am: 30 });
  },
  partridge: (t) => {
    for (let i = 0; i < 7; i++) tone(t + i * 0.07, { f: 1700 - i * 70, dur: 0.05, peak: 0.11, type: "square" });
  },
  raven: (t) => {
    noise(t, { f: 550, q: 0.4, dur: 0.34, peak: 0.18 });
    tone(t, { f: 170, f2: 140, dur: 0.34, peak: 0.12, type: "sawtooth", am: 22, harm: [1, 2], harmGain: [1, 0.4] });
  },
  lovebird: (t) => {
    [2600, 3100, 2800, 3300, 2900].forEach((f, i) => tone(t + i * 0.07, { f, f2: f * 1.15, dur: 0.06, peak: 0.1, vib: 35, vibDepth: 160 }));
  },
  parakeet: (t) => {
    for (let i = 0; i < 11; i++) tone(t + i * 0.05, { f: 2700 + (i % 3) * 450, dur: 0.04, peak: 0.09, type: "square" });
  },
  bluebird: (t) => {
    [2000, 2500, 2200, 2700].forEach((f, i) => tone(t + i * 0.1, { f, f2: f * 1.2, dur: 0.1, peak: 0.11, vib: 25, vibDepth: 130 }));
  },
};

export function birdVoice(id: string) {
  if (!enabled) return;
  try {
    const name = id.split("_")[0].toLowerCase();
    const t = ac().currentTime + 0.02;
    const fn = V[name];
    if (fn) fn(t);
    else {
      let h = 0;
      for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const base = 900 + (h % 8) * 120;
      [0, 5].forEach((s, i) =>
        tone(t + i * 0.09, { f: base * Math.pow(2, s / 12), f2: base * 1.5, dur: 0.12, peak: 0.13 })
      );
    }
  } catch {
    /* no-op */
  }
}

export function tabSound(tier: string) {
  if (!enabled) return;
  try {
    const t = ac().currentTime + 0.02;
    if (tier === "premium") {
      [523, 659, 784].forEach((f, i) => tone(t + i * 0.08, { f, dur: 0.16, peak: 0.13, type: "triangle" }));
      tone(t + 0.26, { f: 1046, dur: 0.22, peak: 0.12 });
    } else if (tier === "legendary") {
      [196, 262].forEach((f) => tone(t, { f, dur: 0.75, peak: 0.08, type: "triangle" }));
      [392, 523, 659, 880].forEach((f, i) => tone(t + i * 0.1, { f, dur: 0.5, peak: 0.12, type: "sawtooth" }));
      tone(t + 0.42, { f: 1318, dur: 0.5, peak: 0.1, vib: 6, vibDepth: 20 });
    } else if (tier === "seasonal") {
      for (let i = 0; i < 6; i++) tone(t + i * 0.07, { f: 2300 + (i % 2 ? 520 : 0), dur: 0.06, peak: 0.1 });
      [1568, 2093].forEach((f, i) => tone(t + 0.3 + i * 0.09, { f, dur: 0.12, peak: 0.1, type: "triangle" }));
    } else if (tier === "special") {
      [660, 990, 1320, 1760].forEach((f, i) => tone(t + i * 0.07, { f, dur: 0.45, peak: 0.1, vib: 7, vibDepth: 16, type: "triangle" }));
      tone(t + 0.4, { f: 2640, dur: 0.4, peak: 0.07, vib: 9, vibDepth: 30 });
    } else {
      tone(t, { f: 660, dur: 0.12, peak: 0.1 });
    }
  } catch {
    /* no-op */
  }
}
