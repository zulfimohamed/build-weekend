'use strict';

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, DPR = 1;
let mode = 'train';           // 'train' | 'plane'
let tod = 'sunset';           // 'day' | 'sunset' | 'night'
const TOD_ORDER = ['day', 'sunset', 'night'];

const PALETTES = {
  day: {
    skyTop: '#6db9ee', skyBot: '#d9eefb',
    sun: '#fff6c8', glow: 'rgba(255,246,200,0.5)',
    cloud: 'rgba(255,255,255,0.9)',
    far: '#9fbfd4', mid: '#7ba98b', near: '#3e7a4e', nearAlt: '#2f6440',
    ground: '#5b9160', groundDark: '#3e6b45', streak: 'rgba(255,255,255,0.20)',
    deckTop: '#ffffff', deckBot: '#dbe9f4',
    wing: '#97a1ac', wingDark: '#5d6670',
    stars: 0,
  },
  sunset: {
    skyTop: '#41335f', skyBot: '#ff9e63',
    sun: '#ffd27a', glow: 'rgba(255,160,90,0.55)',
    cloud: 'rgba(255,205,170,0.75)',
    far: '#6d5a8a', mid: '#53406e', near: '#31284c', nearAlt: '#282043',
    ground: '#3a3060', groundDark: '#241d40', streak: 'rgba(255,190,140,0.16)',
    deckTop: '#ffd9b0', deckBot: '#b98ca0',
    wing: '#6b5f74', wingDark: '#3d3548',
    stars: 0.35,
  },
  night: {
    skyTop: '#050912', skyBot: '#17203b',
    sun: '#eef0e2', glow: 'rgba(220,230,255,0.25)',
    cloud: 'rgba(190,205,235,0.20)',
    far: '#101828', mid: '#0c1220', near: '#070b16', nearAlt: '#0a0f1c',
    ground: '#0a101f', groundDark: '#05080f', streak: 'rgba(170,190,240,0.10)',
    deckTop: '#2a3450', deckBot: '#141b30',
    wing: '#2c313c', wingDark: '#171b23',
    stars: 1,
  },
};

// ---------- strips (pre-rendered scrolling layers) ----------

let SW = 0;
let stripClouds, stripMountains, stripHills, stripTrees;   // train
let stripFar, stripDeck;                                   // plane
let stars = [];
let streaks = [];

function makeStrip(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * DPR);
  c.height = Math.ceil(h * DPR);
  const g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  draw(g, w, h);
  return { c, w, h };
}

function drawStrip(strip, y, offset) {
  const off = ((offset % strip.w) + strip.w) % strip.w;
  ctx.drawImage(strip.c, -off, y, strip.w, strip.h);
  ctx.drawImage(strip.c, -off + strip.w, y, strip.w, strip.h);
}

// a seamless ridge built from whole-cycle sine waves
function ridgeSines(g, w, h, amp, freqs, color) {
  const phases = freqs.map(() => Math.random() * Math.PI * 2);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    let y = h;
    freqs.forEach((k, i) => {
      y -= (amp / (i + 1)) * (0.5 + 0.5 * Math.sin(phases[i] + (x * k * 2 * Math.PI) / w));
    });
    g.lineTo(x, y);
  }
  g.lineTo(w, h);
  g.closePath();
  g.fill();
}

function drawCloudBlobs(g, w, h, count, color) {
  g.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const cx = Math.random() * w;
    const cy = h * (0.15 + Math.random() * 0.55);
    const s = 20 + Math.random() * 45;
    for (const dx of [0, -w, w]) {
      g.beginPath();
      g.ellipse(cx + dx, cy, s * 2.2, s * 0.55, 0, 0, Math.PI * 2);
      g.ellipse(cx + dx - s, cy + s * 0.15, s * 1.3, s * 0.4, 0, 0, Math.PI * 2);
      g.ellipse(cx + dx + s, cy + s * 0.18, s * 1.4, s * 0.45, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function drawTreeline(g, w, h, p) {
  const lit = p.stars > 0;
  let x = 0;
  let sinceHouse = 0;
  while (x < w) {
    if (sinceHouse > 8 + Math.random() * 6) {
      // a little house among the trees
      sinceHouse = 0;
      const hw = 42 + Math.random() * 22;
      const hh = 26 + Math.random() * 12;
      for (const dx of [0, -w, w]) {
        g.fillStyle = p.nearAlt;
        g.fillRect(x + dx, h - hh, hw, hh);
        g.beginPath();
        g.moveTo(x + dx - 4, h - hh);
        g.lineTo(x + dx + hw / 2, h - hh - 18);
        g.lineTo(x + dx + hw + 4, h - hh);
        g.closePath();
        g.fill();
        if (lit) {
          g.fillStyle = 'rgba(255,215,106,0.9)';
          g.fillRect(x + dx + hw * 0.2, h - hh * 0.7, 7, 8);
          if (Math.random() < 0.6) g.fillRect(x + dx + hw * 0.62, h - hh * 0.7, 7, 8);
        }
      }
      x += hw + 20 + Math.random() * 40;
      continue;
    }
    // a tree: conifer or round
    const th = h * (0.35 + Math.random() * 0.55);
    const tw = th * (0.34 + Math.random() * 0.2);
    g.fillStyle = Math.random() < 0.5 ? p.near : p.nearAlt;
    for (const dx of [0, -w, w]) {
      if (Math.random() < 0.65) {
        g.beginPath();
        g.moveTo(x + dx, h);
        g.lineTo(x + dx + tw / 2, h - th);
        g.lineTo(x + dx + tw, h);
        g.closePath();
        g.fill();
      } else {
        g.fillRect(x + dx + tw / 2 - 2, h - th * 0.5, 4, th * 0.5);
        g.beginPath();
        g.ellipse(x + dx + tw / 2, h - th * 0.62, tw * 0.55, th * 0.42, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    sinceHouse++;
    x += 22 + Math.random() * 55;
  }
}

function drawCloudDeck(g, w, h, p) {
  const topY = h * 0.22;
  const grad = g.createLinearGradient(0, topY, 0, h);
  grad.addColorStop(0, p.deckTop);
  grad.addColorStop(1, p.deckBot);
  g.fillStyle = grad;
  g.fillRect(0, topY, w, h - topY);
  g.fillStyle = p.deckTop;
  let x = 0;
  while (x < w) {
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const r = 22 + Math.random() * 48;
      const cx = x + (Math.random() - 0.5) * 110;
      const cy = topY + (Math.random() - 0.4) * 34;
      for (const dx of [0, -w, w]) {
        g.beginPath();
        g.arc(cx + dx, cy, r, 0, Math.PI * 2);
        g.fill();
      }
    }
    x += 90 + Math.random() * 120;
  }
}

function makeStars() {
  const arr = [];
  for (let i = 0; i < 150; i++) {
    arr.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.55,
      r: 0.4 + Math.random() * 1.1,
      ph: Math.random() * Math.PI * 2,
    });
  }
  return arr;
}

function makeStreaks() {
  const horizonY = H * 0.58;
  const arr = [];
  for (let i = 0; i < 26; i++) {
    arr.push({
      x: Math.random() * W * 1.5,
      y: horizonY + H * 0.08 + Math.random() * (H - horizonY - H * 0.08),
      len: 60 + Math.random() * 140,
      sp: 900 + Math.random() * 800,
    });
  }
  return arr;
}

function buildScene() {
  const p = PALETTES[tod];
  stars = makeStars();
  SW = Math.max(W * 2, 1600);
  if (mode === 'train') {
    stripClouds = makeStrip(SW, H * 0.4, (g, w, h) => drawCloudBlobs(g, w, h, 10, p.cloud));
    stripMountains = makeStrip(SW, H * 0.38, (g, w, h) => ridgeSines(g, w, h, h * 0.8, [2, 5], p.far));
    stripHills = makeStrip(SW, H * 0.2, (g, w, h) => ridgeSines(g, w, h, h * 0.85, [3, 7], p.mid));
    stripTrees = makeStrip(SW, H * 0.3, (g, w, h) => drawTreeline(g, w, h, p));
    streaks = makeStreaks();
  } else {
    stripFar = makeStrip(SW, 140, (g, w, h) => drawCloudBlobs(g, w, h, 12, p.cloud));
    stripDeck = makeStrip(SW, H * 0.55, (g, w, h) => drawCloudDeck(g, w, h, p));
  }
}

// ---------- crossfade between scenes ----------

let fade = null;

function snapshot() {
  if (!canvas.width) return;
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  c.getContext('2d').drawImage(canvas, 0, 0);
  fade = { c, alpha: 1 };
}

// ---------- drawing ----------

let t = 0;

function drawSky(p) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, p.skyTop);
  grad.addColorStop(1, p.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (p.stars > 0) {
    for (const s of stars) {
      ctx.globalAlpha = p.stars * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + s.ph)));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // sun / moon
  const horizonY = H * 0.58;
  let cx, cy, r;
  if (tod === 'day') { cx = W * 0.75; cy = H * 0.18; r = 38; }
  else if (tod === 'sunset') { cx = W * 0.5; cy = horizonY - 40; r = 55; }
  else { cx = W * 0.72; cy = H * 0.2; r = 32; }

  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 4);
  glow.addColorStop(0, p.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 4, cy - r * 4, r * 8, r * 8);

  ctx.fillStyle = p.sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  if (tod === 'night') {
    // bite a crescent out of the moon
    ctx.fillStyle = p.skyTop;
    ctx.beginPath();
    ctx.arc(cx + r * 0.38, cy - r * 0.12, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrain(p, dt) {
  const horizonY = H * 0.58;

  ctx.save();
  ctx.translate(0, Math.sin(t * 23) * 0.9 + Math.sin(t * 7.3) * 0.6);

  drawSky(p);
  drawStrip(stripClouds, H * 0.04, t * 10);
  drawStrip(stripMountains, horizonY - stripMountains.h, t * 22);
  drawStrip(stripHills, horizonY - stripHills.h, t * 60);

  const grad = ctx.createLinearGradient(0, horizonY, 0, H);
  grad.addColorStop(0, p.ground);
  grad.addColorStop(1, p.groundDark);
  ctx.fillStyle = grad;
  ctx.fillRect(0, horizonY - 2, W, H - horizonY + 2);

  drawStrip(stripTrees, horizonY + H * 0.06 - stripTrees.h, t * 190);

  // motion streaks in the near ground
  ctx.strokeStyle = p.streak;
  ctx.lineWidth = 2;
  for (const s of streaks) {
    s.x -= s.sp * dt;
    if (s.x + s.len < 0) {
      s.x = W + Math.random() * 200;
      s.y = horizonY + H * 0.08 + Math.random() * (H - horizonY - H * 0.08);
      s.sp = 900 + Math.random() * 800;
      s.len = 60 + Math.random() * 140;
    }
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.len, s.y);
    ctx.stroke();
  }

  // telegraph poles whipping past, wires sagging between them
  const spacing = Math.max(W * 0.55, 420);
  const off = (t * 850) % spacing;
  const topY = H * 0.16;
  const poleXs = [];
  for (let k = -1; k <= Math.ceil(W / spacing) + 1; k++) {
    poleXs.push(k * spacing - off);
  }
  ctx.fillStyle = '#14161b';
  for (const x of poleXs) {
    ctx.fillRect(x - 5, topY, 10, H - topY);
    ctx.fillRect(x - 38, topY + 22, 76, 7);
    ctx.fillRect(x - 28, topY + 56, 56, 6);
  }
  ctx.strokeStyle = 'rgba(10,12,16,0.6)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < poleXs.length - 1; i++) {
    for (const wy of [topY + 25, topY + 59]) {
      ctx.beginPath();
      ctx.moveTo(poleXs[i], wy);
      ctx.quadraticCurveTo((poleXs[i] + poleXs[i + 1]) / 2, wy + 34, poleXs[i + 1], wy);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawPlane(p) {
  const bob = Math.sin(t * 0.6) * 7 + Math.sin(t * 1.7) * 2.5;

  ctx.save();
  ctx.translate(0, bob);
  drawSky(p);
  drawStrip(stripFar, H * 0.44, t * 6);
  drawStrip(stripDeck, H * 0.52, t * 26);
  ctx.restore();

  // the wing stays with you; the world does the moving.
  // sized against the porthole opening (see #frame in style.css) so it
  // actually shows through the window on any screen size.
  const vmin = Math.min(W, H);
  const pw = Math.min(vmin * 0.46, 380);
  const ph = Math.min(vmin * 0.64, 520);
  const cx = W / 2, cy = H / 2;
  const rootX = cx - pw * 0.4, rootY = cy + ph;
  const tipX = cx + pw * 0.38, tipY = cy + ph * 0.02;
  const wingGrad = ctx.createLinearGradient(rootX, cy + ph * 0.6, tipX, tipY);
  wingGrad.addColorStop(0, p.wing);
  wingGrad.addColorStop(1, p.wingDark);
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(rootX, rootY);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(cx + pw * 0.56, cy + ph * 0.07);
  ctx.lineTo(cx + pw * 1.1, cy + ph);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rootX, rootY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // wingtip nav light
  if (t % 1.4 < 0.12) {
    const lx = cx + pw * 0.4, ly = cy + ph * 0.045;
    const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 14);
    g.addColorStop(0, 'rgba(255,60,60,0.95)');
    g.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

let last = 0;
function frame(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;
  t += dt;

  const p = PALETTES[tod];
  if (mode === 'train') drawTrain(p, dt);
  else drawPlane(p);

  if (fade) {
    fade.alpha -= dt / 0.7;
    if (fade.alpha <= 0) {
      fade = null;
    } else {
      ctx.save();
      ctx.globalAlpha = fade.alpha;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(fade.c, 0, 0);
      ctx.restore();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
  }

  requestAnimationFrame(frame);
}

// ---------- sound ----------

let ac = null, noiseFilter = null, noiseGain = null, burstBuf = null;
let clackInt = null;
let soundOn = false;

function ensureAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();

  const len = ac.sampleRate * 3;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let lastS = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    lastS = (lastS + 0.02 * w) / 1.02;
    d[i] = lastS * 3.5;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  noiseFilter = ac.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseGain = ac.createGain();
  noiseGain.gain.value = 0;
  src.connect(noiseFilter).connect(noiseGain).connect(ac.destination);
  src.start();

  const bl = Math.floor(ac.sampleRate * 0.08);
  burstBuf = ac.createBuffer(1, bl, ac.sampleRate);
  const bd = burstBuf.getChannelData(0);
  for (let i = 0; i < bl; i++) bd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bl, 2);
}

function clack(when) {
  const s = ac.createBufferSource();
  s.buffer = burstBuf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  const g = ac.createGain();
  g.gain.value = 0.35;
  s.connect(f).connect(g).connect(ac.destination);
  s.start(when);
}

function applySound() {
  if (!ac) return;
  if (!soundOn) {
    noiseGain.gain.setTargetAtTime(0, ac.currentTime, 0.2);
    if (clackInt) { clearInterval(clackInt); clackInt = null; }
    return;
  }
  if (mode === 'plane') {
    noiseFilter.frequency.value = 320;
    noiseGain.gain.setTargetAtTime(0.35, ac.currentTime, 0.4);
    if (clackInt) { clearInterval(clackInt); clackInt = null; }
  } else {
    noiseFilter.frequency.value = 900;
    noiseGain.gain.setTargetAtTime(0.2, ac.currentTime, 0.4);
    if (!clackInt) {
      clackInt = setInterval(() => {
        const t0 = ac.currentTime + 0.05;
        clack(t0);
        clack(t0 + 0.13);
        clack(t0 + 0.82);
        clack(t0 + 0.95);
      }, 1700);
    }
  }
}

// ---------- controls ----------

const modeBtn = document.getElementById('mode');
const timeBtn = document.getElementById('time');
const soundBtn = document.getElementById('sound');

const TOD_LABEL = { day: '☀️ day', sunset: '\u{1F307} sunset', night: '\u{1F319} night' };

function updateLabels() {
  modeBtn.innerHTML = mode === 'train'
    ? '✈️ take the plane'
    : '\u{1F686} take the train';
  const next = TOD_ORDER[(TOD_ORDER.indexOf(tod) + 1) % TOD_ORDER.length];
  timeBtn.textContent = TOD_LABEL[next];
}

modeBtn.addEventListener('click', () => {
  snapshot();
  mode = mode === 'train' ? 'plane' : 'train';
  document.body.className = mode;
  buildScene();
  applySound();
  updateLabels();
});

timeBtn.addEventListener('click', () => {
  snapshot();
  tod = TOD_ORDER[(TOD_ORDER.indexOf(tod) + 1) % TOD_ORDER.length];
  buildScene();
  updateLabels();
});

soundBtn.addEventListener('click', () => {
  ensureAudio();
  ac.resume();
  soundOn = !soundOn;
  soundBtn.textContent = (soundOn ? '\u{1F50A}' : '\u{1F507}') + ' sound';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  applySound();
});

// ---------- boot ----------

// shareable starting views: ?mode=plane&time=night
const params = new URLSearchParams(location.search);
if (params.get('mode') === 'plane') {
  mode = 'plane';
  document.body.className = 'plane';
}
if (TOD_ORDER.includes(params.get('time'))) {
  tod = params.get('time');
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.ceil(W * DPR);
  canvas.height = Math.ceil(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildScene();
}

window.addEventListener('resize', resize);
resize();
updateLabels();
requestAnimationFrame(frame);
