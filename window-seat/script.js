'use strict';

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, DPR = 1;
let mode = 'train';           // 'train' | 'plane'
let tod = 'sunset';           // 'day' | 'sunset' | 'night'
let scenery = 'countryside';  // key of SCENERY
let aircraft = 'a350';        // key of AIRCRAFT
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
    sea: '#2f86b3', seaDark: '#1d5f85',
    snow: 'rgba(255,255,255,0.85)',
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
    sea: '#6e4a86', seaDark: '#43305e',
    snow: 'rgba(255,220,200,0.6)',
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
    sea: '#0e1c33', seaDark: '#060d1a',
    snow: 'rgba(200,215,240,0.35)',
    stars: 1,
  },
};

// ---------- places, routes, aircraft ----------

const PLACES = [
  { code: 'KUL', name: 'Kuala Lumpur', scenery: 'city' },
  { code: 'SIN', name: 'Singapore', scenery: 'city' },
  { code: 'TYO', name: 'Tokyo', scenery: 'coast' },
  { code: 'SFO', name: 'San Francisco', scenery: 'coast' },
  { code: 'LIS', name: 'Lisbon', scenery: 'coast' },
  { code: 'DXB', name: 'Dubai', scenery: 'desert' },
  { code: 'DOH', name: 'Doha', scenery: 'desert' },
  { code: 'MRK', name: 'Marrakesh', scenery: 'desert' },
  { code: 'ZRH', name: 'Zurich', scenery: 'alps' },
  { code: 'OSL', name: 'Oslo', scenery: 'alps' },
  { code: 'KEF', name: 'Reykjavik', scenery: 'alps' },
  { code: 'EDI', name: 'Edinburgh', scenery: 'countryside' },
  { code: 'DUB', name: 'Dublin', scenery: 'countryside' },
  { code: 'NYC', name: 'New York', scenery: 'city' },
];
let origin = 'KUL';
let dest = 'ZRH';

const AIRCRAFT = {
  a350: { label: 'Airbus A350', wing: 'sharklet', humFreq: 300, humGain: 0.35, prop: false },
  b747: { label: 'Boeing 747', wing: 'jumbo', humFreq: 230, humGain: 0.42, prop: false },
  atr72: { label: 'ATR 72', wing: 'prop', humFreq: 520, humGain: 0.24, prop: true },
};

// ---------- scenery ----------
// Each scenery supplies palette overrides per time of day and the three
// parallax strip painters for train mode (far / mid / near).

const SCENERY = {
  countryside: {
    label: '\u{1F304} countryside',
    overrides: {},
    far: (g, w, h, p) => ridgeSines(g, w, h, h * 0.8, [2, 5], p.far),
    mid: (g, w, h, p) => ridgeSines(g, w, h, h * 0.85, [3, 7], p.mid),
    near: (g, w, h, p) => drawTreeline(g, w, h, p),
  },
  coast: {
    label: '\u{1F30A} coast',
    overrides: {
      day: { ground: '#e2cf9b', groundDark: '#c4ad78', far: '#8fb3c9' },
      sunset: { ground: '#c9986e', groundDark: '#8f6350' },
      night: { ground: '#1a2030', groundDark: '#0d1220' },
    },
    far: (g, w, h, p) => ridgeSines(g, w, h, h * 0.55, [2, 4], p.far),
    mid: (g, w, h, p) => drawSea(g, w, h, p),
    near: (g, w, h, p) => drawCoastNear(g, w, h, p),
  },
  desert: {
    label: '\u{1F335} desert',
    overrides: {
      day: { far: '#c98f66', mid: '#d9a877', ground: '#e0b27e', groundDark: '#b98c5a', near: '#4a7a4e', nearAlt: '#3c6b40' },
      sunset: { far: '#7a4a63', mid: '#96566b', ground: '#a35b56', groundDark: '#6e3c44' },
      night: { far: '#141222', mid: '#1a1830', ground: '#151327', groundDark: '#0a0916' },
    },
    far: (g, w, h, p) => drawMesas(g, w, h, p),
    mid: (g, w, h, p) => ridgeSines(g, w, h, h * 0.7, [1, 3], p.mid),
    near: (g, w, h, p) => drawDesertNear(g, w, h, p),
  },
  alps: {
    label: '\u{26F0}\u{FE0F} alps',
    overrides: {
      day: { far: '#8ea3b8', mid: '#b9cfdd', ground: '#e8f1f6', groundDark: '#c2d4e0', near: '#2f5947', nearAlt: '#254a3a' },
      sunset: { far: '#5d4a78', mid: '#6e5a8a', ground: '#b393b8', groundDark: '#8f7aa8', near: '#2a2348', nearAlt: '#221d3c' },
      night: { far: '#131a2a', mid: '#182136', ground: '#1c2740', groundDark: '#101828' },
    },
    far: (g, w, h, p) => drawPeaks(g, w, h, p),
    mid: (g, w, h, p) => ridgeSines(g, w, h, h * 0.8, [3, 6], p.mid),
    near: (g, w, h, p) => drawSnowTreeline(g, w, h, p),
  },
  city: {
    label: '\u{1F3D9}\u{FE0F} city',
    overrides: {
      day: { far: '#9aa8bb', mid: '#6d7d92', near: '#3a4656', nearAlt: '#2e3947', ground: '#57606c', groundDark: '#3a414c' },
      sunset: { ground: '#3c3350', groundDark: '#262040' },
      night: { ground: '#0c101a', groundDark: '#060810' },
    },
    far: (g, w, h, p) => drawSkyline(g, w, h, p, 0.35, 34, 70),
    mid: (g, w, h, p) => drawSkyline(g, w, h, p, 0.5, 50, 90, true),
    near: (g, w, h, p) => drawCityNear(g, w, h, p),
  },
};
const SCENERY_ORDER = Object.keys(SCENERY);

function palette() {
  const base = PALETTES[tod];
  const over = SCENERY[scenery].overrides[tod];
  return over ? Object.assign({}, base, over) : base;
}

// ---------- strips (pre-rendered scrolling layers) ----------

let SW = 0;
let stripClouds, stripMountains, stripHills, stripTrees;   // train
let stripFar, stripDeck, stripGround;                      // plane
let stars = [];
let streaks = [];
let flakes = [];
let birds = [];
let meteor = null;

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

// --- coast ---

function drawSea(g, w, h, p) {
  const top = h * 0.2;
  const grad = g.createLinearGradient(0, top, 0, h);
  grad.addColorStop(0, p.sea);
  grad.addColorStop(1, p.seaDark);
  g.fillStyle = grad;
  g.fillRect(0, top, w, h - top);
  // wave glints
  g.strokeStyle = tod === 'night' ? 'rgba(190,210,240,0.18)' : 'rgba(255,255,255,0.45)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 90; i++) {
    const y = top + 4 + Math.random() * (h - top - 6);
    const x = Math.random() * w;
    const len = 8 + Math.random() * 30 * ((y - top) / (h - top) + 0.3);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y);
    g.stroke();
  }
  // a few boats on the horizon
  for (let i = 0; i < 4; i++) {
    const bx = Math.random() * w;
    const by = top + 3 + Math.random() * (h * 0.18);
    for (const dx of [0, -w, w]) {
      if (tod === 'night') {
        g.fillStyle = 'rgba(255,215,106,0.9)';
        g.fillRect(bx + dx, by, 3, 3);
      } else {
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.beginPath();
        g.moveTo(bx + dx, by + 5);
        g.lineTo(bx + dx + 6, by - 8);
        g.lineTo(bx + dx + 6, by + 5);
        g.closePath();
        g.fill();
        g.fillStyle = p.seaDark;
        g.fillRect(bx + dx - 3, by + 5, 14, 3);
      }
    }
  }
}

function drawCoastNear(g, w, h, p) {
  const lit = p.stars > 0;
  let x = 0;
  let sinceTower = 0;
  while (x < w) {
    if (sinceTower > 10 + Math.random() * 8) {
      // a lighthouse
      sinceTower = 0;
      const th = h * 0.85, tw = 16;
      for (const dx of [0, -w, w]) {
        g.fillStyle = tod === 'night' ? '#1a2233' : '#e8e4da';
        g.fillRect(x + dx, h - th, tw, th);
        g.fillStyle = tod === 'night' ? '#2a1f2e' : '#c14a4a';
        g.fillRect(x + dx, h - th + th * 0.25, tw, th * 0.16);
        g.fillRect(x + dx, h - th + th * 0.62, tw, th * 0.16);
        g.fillStyle = lit ? 'rgba(255,235,140,0.95)' : '#333a44';
        g.fillRect(x + dx - 2, h - th - 10, tw + 4, 10);
      }
      x += tw + 90 + Math.random() * 80;
      continue;
    }
    // palm tree or beach shrub
    if (Math.random() < 0.55) {
      const th = h * (0.4 + Math.random() * 0.4);
      g.strokeStyle = p.nearAlt;
      g.fillStyle = p.near;
      for (const dx of [0, -w, w]) {
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(x + dx, h);
        g.quadraticCurveTo(x + dx + 8, h - th * 0.6, x + dx + 16, h - th);
        g.stroke();
        for (let f = 0; f < 5; f++) {
          const a = -Math.PI * 0.15 - (f / 4) * Math.PI * 0.75;
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(x + dx + 16, h - th);
          g.quadraticCurveTo(
            x + dx + 16 + Math.cos(a) * 22, h - th + Math.sin(a) * 22 - 6,
            x + dx + 16 + Math.cos(a) * 40, h - th + Math.sin(a) * 40 + 8
          );
          g.stroke();
        }
      }
    } else {
      g.fillStyle = Math.random() < 0.5 ? p.near : p.nearAlt;
      const s = 8 + Math.random() * 14;
      for (const dx of [0, -w, w]) {
        g.beginPath();
        g.ellipse(x + dx, h - s * 0.5, s, s * 0.6, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
    sinceTower++;
    x += 40 + Math.random() * 80;
  }
}

// --- desert ---

function drawMesas(g, w, h, p) {
  g.fillStyle = p.far;
  let x = 0;
  while (x < w) {
    const mw = 90 + Math.random() * 180;
    const mh = h * (0.3 + Math.random() * 0.5);
    const slope = 14 + Math.random() * 20;
    for (const dx of [0, -w, w]) {
      g.beginPath();
      g.moveTo(x + dx, h);
      g.lineTo(x + dx + slope, h - mh);
      g.lineTo(x + dx + mw - slope, h - mh);
      g.lineTo(x + dx + mw, h);
      g.closePath();
      g.fill();
    }
    x += mw + 60 + Math.random() * 160;
  }
}

function drawDesertNear(g, w, h, p) {
  let x = 0;
  while (x < w) {
    const r = Math.random();
    if (r < 0.45) {
      // saguaro cactus
      const th = h * (0.3 + Math.random() * 0.45);
      const cw = 10 + th * 0.06;
      g.fillStyle = Math.random() < 0.5 ? p.near : p.nearAlt;
      for (const dx of [0, -w, w]) {
        g.fillRect(x + dx, h - th, cw, th);
        g.beginPath();
        g.arc(x + dx + cw / 2, h - th, cw / 2, Math.PI, 0);
        g.fill();
        // arms
        const ay = h - th * 0.6;
        g.fillRect(x + dx - cw * 1.2, ay, cw * 1.2, cw * 0.8);
        g.fillRect(x + dx - cw * 1.2, ay - th * 0.2, cw * 0.8, th * 0.2 + cw * 0.8);
        const ay2 = h - th * 0.45;
        g.fillRect(x + dx + cw, ay2, cw * 1.1, cw * 0.8);
        g.fillRect(x + dx + cw * 1.3, ay2 - th * 0.15, cw * 0.8, th * 0.15 + cw * 0.8);
      }
    } else if (r < 0.8) {
      // rock
      g.fillStyle = p.groundDark;
      const s = 10 + Math.random() * 24;
      for (const dx of [0, -w, w]) {
        g.beginPath();
        g.ellipse(x + dx, h - s * 0.4, s, s * 0.55, 0, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      // dry scrub
      g.fillStyle = p.nearAlt;
      for (const dx of [0, -w, w]) {
        for (let b = 0; b < 4; b++) {
          const s = 4 + Math.random() * 7;
          g.beginPath();
          g.arc(x + dx + b * 7 - 10, h - s * 0.7, s, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    x += 70 + Math.random() * 130;
  }
}

// --- alps ---

function drawPeaks(g, w, h, p) {
  let x = 0;
  const peaks = [];
  while (x < w) {
    const pw = 110 + Math.random() * 170;
    const ph = h * (0.45 + Math.random() * 0.5);
    peaks.push({ x, pw, ph });
    x += pw * (0.55 + Math.random() * 0.35);
  }
  for (const pk of peaks) {
    for (const dx of [0, -w, w]) {
      const cx = pk.x + dx + pk.pw / 2;
      g.fillStyle = p.far;
      g.beginPath();
      g.moveTo(pk.x + dx, h);
      g.lineTo(cx, h - pk.ph);
      g.lineTo(pk.x + dx + pk.pw, h);
      g.closePath();
      g.fill();
      // snow cap
      const capH = pk.ph * 0.34;
      const frac = capH / pk.ph;
      g.fillStyle = p.snow;
      g.beginPath();
      g.moveTo(cx, h - pk.ph);
      g.lineTo(cx + (pk.pw / 2) * frac, h - pk.ph + capH);
      g.lineTo(cx + pk.pw * 0.08, h - pk.ph + capH * 0.72);
      g.lineTo(cx, h - pk.ph + capH * 1.05);
      g.lineTo(cx - pk.pw * 0.09, h - pk.ph + capH * 0.68);
      g.lineTo(cx - (pk.pw / 2) * frac, h - pk.ph + capH);
      g.closePath();
      g.fill();
    }
  }
}

function drawSnowTreeline(g, w, h, p) {
  const lit = p.stars > 0;
  let x = 0;
  let sinceChalet = 0;
  while (x < w) {
    if (sinceChalet > 9 + Math.random() * 7) {
      // a chalet with a snowy roof
      sinceChalet = 0;
      const hw = 48 + Math.random() * 24;
      const hh = 26 + Math.random() * 10;
      for (const dx of [0, -w, w]) {
        g.fillStyle = p.nearAlt;
        g.fillRect(x + dx, h - hh, hw, hh);
        g.beginPath();
        g.moveTo(x + dx - 8, h - hh);
        g.lineTo(x + dx + hw / 2, h - hh - 20);
        g.lineTo(x + dx + hw + 8, h - hh);
        g.closePath();
        g.fill();
        g.strokeStyle = p.snow;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x + dx - 8, h - hh);
        g.lineTo(x + dx + hw / 2, h - hh - 20);
        g.lineTo(x + dx + hw + 8, h - hh);
        g.stroke();
        if (lit) {
          g.fillStyle = 'rgba(255,215,106,0.9)';
          g.fillRect(x + dx + hw * 0.18, h - hh * 0.7, 8, 9);
          g.fillRect(x + dx + hw * 0.6, h - hh * 0.7, 8, 9);
        }
      }
      x += hw + 26 + Math.random() * 50;
      continue;
    }
    // snow-dusted conifer
    const th = h * (0.35 + Math.random() * 0.55);
    const tw = th * (0.36 + Math.random() * 0.18);
    for (const dx of [0, -w, w]) {
      g.fillStyle = Math.random() < 0.5 ? p.near : p.nearAlt;
      g.beginPath();
      g.moveTo(x + dx, h);
      g.lineTo(x + dx + tw / 2, h - th);
      g.lineTo(x + dx + tw, h);
      g.closePath();
      g.fill();
      g.strokeStyle = p.snow;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x + dx + tw * 0.12, h - th * 0.24);
      g.lineTo(x + dx + tw / 2, h - th);
      g.lineTo(x + dx + tw * 0.88, h - th * 0.24);
      g.stroke();
    }
    sinceChalet++;
    x += 26 + Math.random() * 55;
  }
}

// --- city ---

function drawSkyline(g, w, h, p, minH, wMin, wMax, useNear) {
  const lit = p.stars > 0;
  const bodyColor = useNear ? p.mid : p.far;
  let x = 0;
  while (x < w) {
    const bw = wMin + Math.random() * (wMax - wMin);
    const bh = h * (minH + Math.random() * (0.95 - minH));
    for (const dx of [0, -w, w]) {
      g.fillStyle = bodyColor;
      g.fillRect(x + dx, h - bh, bw, bh);
      if (Math.random() < 0.25) g.fillRect(x + dx + bw / 2 - 2, h - bh - 14, 4, 14);
      // windows
      const cols = Math.max(2, Math.floor(bw / 14));
      const rows = Math.max(3, Math.floor(bh / 16));
      for (let cCol = 0; cCol < cols; cCol++) {
        for (let rRow = 0; rRow < rows; rRow++) {
          const on = Math.random() < (lit ? 0.45 : 0.2);
          if (!on) continue;
          g.fillStyle = lit ? 'rgba(255,215,106,0.75)' : 'rgba(255,255,255,0.25)';
          g.fillRect(
            x + dx + 4 + cCol * (bw - 8) / cols,
            h - bh + 5 + rRow * (bh - 10) / rows,
            3, 4
          );
        }
      }
    }
    x += bw + 6 + Math.random() * 26;
  }
}

function drawCityNear(g, w, h, p) {
  const lit = p.stars > 0;
  let x = 0;
  while (x < w) {
    const bw = 70 + Math.random() * 110;
    const bh = h * (0.5 + Math.random() * 0.45);
    for (const dx of [0, -w, w]) {
      g.fillStyle = Math.random() < 0.5 ? p.near : p.nearAlt;
      g.fillRect(x + dx, h - bh, bw, bh);
      // storefront glow
      g.fillStyle = lit ? 'rgba(255,190,120,0.85)' : 'rgba(255,255,255,0.3)';
      g.fillRect(x + dx + 6, h - 26, bw - 12, 20);
      // upper windows
      const cols = Math.max(2, Math.floor(bw / 26));
      for (let cCol = 0; cCol < cols; cCol++) {
        if (Math.random() < (lit ? 0.55 : 0.3)) {
          g.fillStyle = lit ? 'rgba(255,215,106,0.8)' : 'rgba(255,255,255,0.28)';
          g.fillRect(x + dx + 8 + cCol * (bw - 16) / cols, h - bh + 10, 10, 13);
        }
      }
    }
    x += bw + 12 + Math.random() * 40;
  }
}

// --- plane: the world far below, per scenery ---

function drawPlaneGround(g, w, h, p) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, p.ground);
  grad.addColorStop(1, p.groundDark);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const lit = p.stars > 0;
  if (scenery === 'countryside') {
    // patchwork fields
    let x = 0;
    while (x < w) {
      const fw = 30 + Math.random() * 90;
      g.fillStyle = Math.random() < 0.5 ? p.groundDark : p.near;
      if (Math.random() < 0.3) g.fillStyle = p.mid;
      g.globalAlpha = 0.5;
      g.fillRect(x, Math.random() * h * 0.5, fw, h);
      g.globalAlpha = 1;
      x += fw + 2;
    }
  } else if (scenery === 'coast') {
    g.fillStyle = p.sea;
    g.fillRect(0, h * 0.35, w, h);
    g.fillStyle = p.ground;
    for (let i = 0; i < 8; i++) {
      const ix = Math.random() * w;
      g.beginPath();
      g.ellipse(ix, h * (0.45 + Math.random() * 0.4), 14 + Math.random() * 30, 5 + Math.random() * 8, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else if (scenery === 'desert') {
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const y = Math.random() * h;
      const x = Math.random() * w;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 40, y - 8, x + 90, y);
      g.stroke();
    }
  } else if (scenery === 'alps') {
    g.strokeStyle = 'rgba(90,110,140,0.4)';
    g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {
      const y = Math.random() * h;
      const x = Math.random() * w;
      g.beginPath();
      g.moveTo(x, y + 10);
      g.lineTo(x + 20 + Math.random() * 30, y - 10);
      g.lineTo(x + 60 + Math.random() * 40, y + 12);
      g.stroke();
    }
  } else if (scenery === 'city') {
    // street grid seen from above
    g.strokeStyle = lit ? 'rgba(255,200,110,0.55)' : 'rgba(255,255,255,0.22)';
    g.lineWidth = 1.5;
    for (let i = 0; i < 22; i++) {
      const y = Math.random() * h;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y + (Math.random() - 0.5) * 20);
      g.stroke();
    }
    if (lit) {
      g.fillStyle = 'rgba(255,215,120,0.8)';
      for (let i = 0; i < 500; i++) {
        g.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
      }
    }
  }
}

// ---------- ambient particles ----------

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

function makeFlakes() {
  const arr = [];
  for (let i = 0; i < 90; i++) {
    arr.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 1 + Math.random() * 2.2,
      sp: 30 + Math.random() * 60,
      drift: 120 + Math.random() * 260,
    });
  }
  return arr;
}

function buildScene() {
  const p = palette();
  const s = SCENERY[scenery];
  stars = makeStars();
  flakes = scenery === 'alps' ? makeFlakes() : [];
  birds = [];
  meteor = null;
  SW = Math.max(W * 2, 1600);
  if (mode === 'train') {
    stripClouds = makeStrip(SW, H * 0.4, (g, w, h) => drawCloudBlobs(g, w, h, 10, p.cloud));
    stripMountains = makeStrip(SW, H * 0.38, (g, w, h) => s.far(g, w, h, p));
    stripHills = makeStrip(SW, H * 0.2, (g, w, h) => s.mid(g, w, h, p));
    stripTrees = makeStrip(SW, H * 0.3, (g, w, h) => s.near(g, w, h, p));
    streaks = makeStreaks();
  } else {
    stripFar = makeStrip(SW, 140, (g, w, h) => drawCloudBlobs(g, w, h, 12, p.cloud));
    stripDeck = makeStrip(SW, H * 0.55, (g, w, h) => drawCloudDeck(g, w, h, p));
    stripGround = makeStrip(SW, Math.max(80, H * 0.16), (g, w, h) => drawPlaneGround(g, w, h, p));
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

// the occasional shooting star at night
function drawMeteor(p, dt) {
  if (p.stars < 0.5) { meteor = null; return; }
  if (!meteor && Math.random() < dt / 9) {
    const a = Math.PI * (0.72 + Math.random() * 0.16);
    meteor = {
      x: W * (0.2 + Math.random() * 0.7),
      y: H * (0.04 + Math.random() * 0.2),
      vx: Math.cos(a) * 900,
      vy: -Math.sin(a) * 900 * 0.35,
      life: 0.9,
    };
  }
  if (!meteor) return;
  meteor.life -= dt;
  meteor.x += meteor.vx * dt;
  meteor.y += meteor.vy * dt;
  if (meteor.life <= 0) { meteor = null; return; }
  const a = Math.min(1, meteor.life / 0.5);
  ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(meteor.x, meteor.y);
  ctx.lineTo(meteor.x - meteor.vx * 0.09, meteor.y - meteor.vy * 0.09);
  ctx.stroke();
}

// the occasional flock of birds by day (train mode)
function drawBirds(p, dt) {
  if (tod !== 'day') { birds = []; return; }
  if (birds.length === 0 && Math.random() < dt / 14) {
    const by = H * (0.12 + Math.random() * 0.25);
    for (let i = 0; i < 5 + Math.floor(Math.random() * 5); i++) {
      birds.push({
        x: W + 60 + i * (26 + Math.random() * 20),
        y: by + (Math.random() - 0.5) * 50,
        ph: Math.random() * Math.PI * 2,
      });
    }
  }
  ctx.strokeStyle = 'rgba(30,40,50,0.75)';
  ctx.lineWidth = 2;
  for (const b of birds) {
    b.x -= 140 * dt;
    const flap = Math.sin(t * 9 + b.ph) * 5;
    ctx.beginPath();
    ctx.moveTo(b.x - 8, b.y - flap);
    ctx.quadraticCurveTo(b.x, b.y + 3, b.x + 8, b.y - flap);
    ctx.stroke();
  }
  birds = birds.filter((b) => b.x > -40);
}

function drawSnow(p, dt) {
  if (flakes.length === 0) return;
  ctx.fillStyle = p.snow;
  for (const f of flakes) {
    f.y += f.sp * dt;
    f.x -= f.drift * dt;
    if (f.y > H) { f.y = -4; f.x = Math.random() * W; }
    if (f.x < -4) f.x = W + 4;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTrain(p, dt) {
  const horizonY = H * 0.58;

  ctx.save();
  ctx.translate(0, Math.sin(t * 23) * 0.9 + Math.sin(t * 7.3) * 0.6);

  drawSky(p);
  drawMeteor(p, dt);
  drawStrip(stripClouds, H * 0.04, t * 10);
  drawStrip(stripMountains, horizonY - stripMountains.h, t * 22);
  drawStrip(stripHills, horizonY - stripHills.h, t * 60);
  drawBirds(p, dt);

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

  drawSnow(p, dt);

  ctx.restore();
}

function lerp(a, b, f) { return a + (b - a) * f; }

function drawWing(p) {
  // the wing stays with you; the world does the moving.
  // sized against the porthole opening (see #frame in style.css) so it
  // actually shows through the window on any screen size.
  const vmin = Math.min(W, H);
  const pw = Math.min(vmin * 0.46, 380);
  const ph = Math.min(vmin * 0.64, 520);
  const cx = W / 2, cy = H / 2;
  const kind = AIRCRAFT[aircraft].wing;
  const high = kind === 'prop';
  // a high-wing turboprop hangs the wing from the top of the window
  const sy = high ? -1 : 1;
  const rootX = cx - pw * 0.4, rootY = cy + sy * ph;
  const tipX = cx + pw * (kind === 'jumbo' ? 0.46 : 0.38);
  const tipY = cy + sy * ph * 0.02;

  const wingGrad = ctx.createLinearGradient(rootX, cy + sy * ph * 0.6, tipX, tipY);
  wingGrad.addColorStop(0, p.wing);
  wingGrad.addColorStop(1, p.wingDark);
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(rootX, rootY);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(cx + pw * 0.56, cy + sy * ph * 0.07);
  ctx.lineTo(cx + pw * 1.1, cy + sy * ph);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rootX, rootY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  if (kind === 'sharklet') {
    // upturned wingtip
    ctx.fillStyle = p.wingDark;
    ctx.beginPath();
    ctx.moveTo(tipX - 4, tipY + 4);
    ctx.lineTo(tipX + 12, tipY - 30);
    ctx.lineTo(tipX + 20, tipY - 27);
    ctx.lineTo(tipX + 10, tipY + 7);
    ctx.closePath();
    ctx.fill();
  }

  if (kind === 'jumbo') {
    // engine pods slung under the wing
    for (const f of [0.32, 0.62]) {
      const ex = lerp(rootX, tipX, f);
      const ey = lerp(rootY, tipY, f) + ph * 0.06;
      const er = pw * (0.1 - f * 0.05);
      ctx.fillStyle = p.wingDark;
      ctx.beginPath();
      ctx.ellipse(ex, ey, er * 2, er, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.ellipse(ex - er * 1.6, ey, er * 0.45, er * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (kind === 'prop') {
    // nacelle + spinning propeller on the high wing
    const ex = lerp(rootX, tipX, 0.42);
    const ey = lerp(rootY, tipY, 0.42) + ph * 0.1;
    const er = pw * 0.09;
    ctx.fillStyle = p.wingDark;
    ctx.beginPath();
    ctx.ellipse(ex, ey, er * 2.1, er, 0, 0, Math.PI * 2);
    ctx.fill();
    const px2 = ex - er * 2.1, py = ey;
    const pr = er * 2.6;
    ctx.fillStyle = 'rgba(180,190,200,0.14)';
    ctx.beginPath();
    ctx.ellipse(px2, py, pr * 0.35, pr, 0, 0, Math.PI * 2);
    ctx.fill();
    const ang = t * 34;
    ctx.strokeStyle = 'rgba(40,45,52,0.8)';
    ctx.lineWidth = 4;
    for (const off of [0, Math.PI * 0.5]) {
      ctx.beginPath();
      ctx.moveTo(px2 + Math.cos(ang + off) * pr * 0.3, py + Math.sin(ang + off) * pr);
      ctx.lineTo(px2 - Math.cos(ang + off) * pr * 0.3, py - Math.sin(ang + off) * pr);
      ctx.stroke();
    }
    ctx.fillStyle = p.wing;
    ctx.beginPath();
    ctx.arc(px2, py, er * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // wingtip nav light
  if (t % 1.4 < 0.12) {
    const lx = tipX + (kind === 'sharklet' ? 14 : 2);
    const ly = kind === 'sharklet' ? tipY - 28 : tipY + sy * ph * 0.025;
    const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, 14);
    g.addColorStop(0, 'rgba(255,60,60,0.95)');
    g.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlane(p, dt) {
  const bob = Math.sin(t * 0.6) * 7 + Math.sin(t * 1.7) * 2.5;

  ctx.save();
  ctx.translate(0, bob);
  drawSky(p);
  drawMeteor(p, dt);
  // the destination's terrain, far below, through gaps in the cloud
  ctx.globalAlpha = 0.9;
  drawStrip(stripGround, H * 0.46, t * 9);
  ctx.globalAlpha = 1;
  const haze = ctx.createLinearGradient(0, H * 0.46, 0, H * 0.62);
  haze.addColorStop(0, p.skyBot);
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = haze;
  ctx.fillRect(0, H * 0.46, W, H * 0.16);
  ctx.restore();
  drawStrip(stripFar, H * 0.44, t * 6);
  drawStrip(stripDeck, H * 0.52, t * 26);
  ctx.restore();

  drawWing(p);
}

let last = 0;
function frame(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;
  t += dt;

  const p = palette();
  if (mode === 'train') drawTrain(p, dt);
  else drawPlane(p, dt);

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
let propGain = null;
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

  // turboprop drone for the ATR
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 86;
  const propFilter = ac.createBiquadFilter();
  propFilter.type = 'lowpass';
  propFilter.frequency.value = 320;
  propGain = ac.createGain();
  propGain.gain.value = 0;
  osc.connect(propFilter).connect(propGain).connect(ac.destination);
  osc.start();

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
    propGain.gain.setTargetAtTime(0, ac.currentTime, 0.2);
    if (clackInt) { clearInterval(clackInt); clackInt = null; }
    return;
  }
  if (mode === 'plane') {
    const a = AIRCRAFT[aircraft];
    noiseFilter.frequency.value = a.humFreq;
    noiseGain.gain.setTargetAtTime(a.humGain, ac.currentTime, 0.4);
    propGain.gain.setTargetAtTime(a.prop ? 0.07 : 0, ac.currentTime, 0.4);
    if (clackInt) { clearInterval(clackInt); clackInt = null; }
  } else {
    noiseFilter.frequency.value = 900;
    noiseGain.gain.setTargetAtTime(0.2, ac.currentTime, 0.4);
    propGain.gain.setTargetAtTime(0, ac.currentTime, 0.2);
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
const sceneryBtn = document.getElementById('scenery');
const soundBtn = document.getElementById('sound');
const fromSel = document.getElementById('from');
const toSel = document.getElementById('to');
const routeArrow = document.getElementById('route-arrow');
const aircraftSel = document.getElementById('aircraft');

const TOD_LABEL = { day: '☀️ day', sunset: '\u{1F307} sunset', night: '\u{1F319} night' };

for (const sel of [fromSel, toSel]) {
  for (const pl of PLACES) {
    const opt = document.createElement('option');
    opt.value = pl.code;
    opt.textContent = `${pl.code} · ${pl.name}`;
    sel.appendChild(opt);
  }
}
for (const [id, a] of Object.entries(AIRCRAFT)) {
  const opt = document.createElement('option');
  opt.value = id;
  opt.textContent = a.label;
  aircraftSel.appendChild(opt);
}

function updateLabels() {
  modeBtn.innerHTML = mode === 'train'
    ? '✈️ take the plane'
    : '\u{1F686} take the train';
  const next = TOD_ORDER[(TOD_ORDER.indexOf(tod) + 1) % TOD_ORDER.length];
  timeBtn.textContent = TOD_LABEL[next];
  const nextScenery = SCENERY_ORDER[(SCENERY_ORDER.indexOf(scenery) + 1) % SCENERY_ORDER.length];
  sceneryBtn.textContent = SCENERY[nextScenery].label;
  routeArrow.textContent = mode === 'plane' ? '✈' : '→';
  fromSel.value = origin;
  toSel.value = dest;
  aircraftSel.value = aircraft;
}

// keep the URL shareable: it always reflects the current view
function syncURL() {
  const q = new URLSearchParams({
    mode, time: tod, scenery, from: origin, to: dest, aircraft,
  });
  history.replaceState(null, '', '?' + q.toString());
}

function refresh() {
  snapshot();
  buildScene();
  applySound();
  updateLabels();
  syncURL();
}

modeBtn.addEventListener('click', () => {
  mode = mode === 'train' ? 'plane' : 'train';
  document.body.className = mode;
  refresh();
});

timeBtn.addEventListener('click', () => {
  tod = TOD_ORDER[(TOD_ORDER.indexOf(tod) + 1) % TOD_ORDER.length];
  refresh();
});

sceneryBtn.addEventListener('click', () => {
  scenery = SCENERY_ORDER[(SCENERY_ORDER.indexOf(scenery) + 1) % SCENERY_ORDER.length];
  refresh();
});

fromSel.addEventListener('change', () => {
  origin = fromSel.value;
  syncURL();
});

// heading somewhere new: the view out the window becomes that place
toSel.addEventListener('change', () => {
  dest = toSel.value;
  const pl = PLACES.find((x) => x.code === dest);
  if (pl) scenery = pl.scenery;
  refresh();
});

aircraftSel.addEventListener('change', () => {
  aircraft = aircraftSel.value;
  refresh();
});

soundBtn.addEventListener('click', () => {
  ensureAudio();
  ac.resume();
  soundOn = !soundOn;
  soundBtn.textContent = (soundOn ? '\u{1F50A}' : '\u{1F507}') + ' sound';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  applySound();
});

// keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'm') modeBtn.click();
  else if (e.key === 't') timeBtn.click();
  else if (e.key === 'n') sceneryBtn.click();
  else if (e.key === 's') soundBtn.click();
});

// ---------- boot ----------

// shareable starting views: ?mode=plane&time=night&scenery=alps&from=KUL&to=ZRH&aircraft=b747
const params = new URLSearchParams(location.search);
if (params.get('mode') === 'plane') {
  mode = 'plane';
  document.body.className = 'plane';
}
if (TOD_ORDER.includes(params.get('time'))) {
  tod = params.get('time');
}
if (PLACES.some((pl) => pl.code === params.get('from'))) origin = params.get('from');
if (PLACES.some((pl) => pl.code === params.get('to'))) {
  dest = params.get('to');
  scenery = PLACES.find((pl) => pl.code === dest).scenery;
}
if (SCENERY_ORDER.includes(params.get('scenery'))) scenery = params.get('scenery');
if (AIRCRAFT[params.get('aircraft')]) aircraft = params.get('aircraft');

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
