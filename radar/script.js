'use strict';

// An approach radar working imaginary traffic at a real hub airport.
// North is up. Positions are nautical miles from the field.
// Every flight enters and leaves the scope along the true great-circle
// bearing of the city it's coming from or going to.
// Blips only move when the beam paints them, like they should.

const canvas = document.getElementById('scope');
const ctx = canvas.getContext('2d');
const wrap = canvas.parentElement;

let W = 0, DPR = 1;          // the scope is square: W x W css px
let range = 40;              // NM from center to edge
const RANGES = [20, 40, 80];
let showLabels = true;
let showTrails = true;
let showWx = false;

const TIME_ACCEL = 8;        // the night shift goes faster here
const SWEEP_PERIOD = 4;      // seconds per rotation
const PHOS = '#39e07a';

// ---------- the world ----------
// hub: selectable as the radar site. rwy: the runway heading in use.

const AIRPORTS = {
  KUL: { name: 'Kuala Lumpur', lat: 2.74, lon: 101.71, rwy: 140, hub: true },
  SIN: { name: 'Singapore', lat: 1.36, lon: 103.99, rwy: 23, hub: true },
  BKK: { name: 'Bangkok', lat: 13.69, lon: 100.75, rwy: 193, hub: true },
  HKG: { name: 'Hong Kong', lat: 22.31, lon: 113.91, rwy: 73, hub: true },
  HND: { name: 'Tokyo Haneda', lat: 35.55, lon: 139.78, rwy: 337, hub: true },
  ICN: { name: 'Seoul Incheon', lat: 37.46, lon: 126.44, rwy: 151, hub: true },
  DXB: { name: 'Dubai', lat: 25.25, lon: 55.36, rwy: 122, hub: true },
  DOH: { name: 'Doha', lat: 25.27, lon: 51.61, rwy: 157, hub: true },
  IST: { name: 'Istanbul', lat: 41.26, lon: 28.74, rwy: 166, hub: true },
  LHR: { name: 'London Heathrow', lat: 51.47, lon: -0.45, rwy: 270, hub: true },
  FRA: { name: 'Frankfurt', lat: 50.03, lon: 8.57, rwy: 249, hub: true },
  CDG: { name: 'Paris CDG', lat: 49.01, lon: 2.55, rwy: 266, hub: true },
  AMS: { name: 'Amsterdam', lat: 52.31, lon: 4.76, rwy: 184, hub: true },
  JFK: { name: 'New York JFK', lat: 40.64, lon: -73.78, rwy: 223, hub: true },
  LAX: { name: 'Los Angeles', lat: 33.94, lon: -118.41, rwy: 263, hub: true },
  SYD: { name: 'Sydney', lat: -33.95, lon: 151.18, rwy: 163, hub: true },

  NRT: { name: 'Tokyo Narita', lat: 35.77, lon: 140.39 },
  KIX: { name: 'Osaka', lat: 34.43, lon: 135.24 },
  TPE: { name: 'Taipei', lat: 25.08, lon: 121.23 },
  PEK: { name: 'Beijing', lat: 40.08, lon: 116.58 },
  PVG: { name: 'Shanghai', lat: 31.14, lon: 121.81 },
  CAN: { name: 'Guangzhou', lat: 23.39, lon: 113.3 },
  MNL: { name: 'Manila', lat: 14.51, lon: 121.02 },
  SGN: { name: 'Ho Chi Minh City', lat: 10.82, lon: 106.65 },
  HAN: { name: 'Hanoi', lat: 21.21, lon: 105.8 },
  CGK: { name: 'Jakarta', lat: -6.13, lon: 106.66 },
  DPS: { name: 'Bali', lat: -8.75, lon: 115.17 },
  PEN: { name: 'Penang', lat: 5.3, lon: 100.28 },
  BKI: { name: 'Kota Kinabalu', lat: 5.94, lon: 116.05 },
  LGK: { name: 'Langkawi', lat: 6.33, lon: 99.73 },
  PER: { name: 'Perth', lat: -31.94, lon: 115.97 },
  MEL: { name: 'Melbourne', lat: -37.67, lon: 144.84 },
  AKL: { name: 'Auckland', lat: -37.01, lon: 174.79 },
  DEL: { name: 'Delhi', lat: 28.57, lon: 77.1 },
  BOM: { name: 'Mumbai', lat: 19.09, lon: 72.87 },
  MAA: { name: 'Chennai', lat: 12.99, lon: 80.17 },
  CMB: { name: 'Colombo', lat: 7.18, lon: 79.88 },
  MLE: { name: 'Male', lat: 4.19, lon: 73.53 },
  DAC: { name: 'Dhaka', lat: 23.84, lon: 90.4 },
  KTM: { name: 'Kathmandu', lat: 27.7, lon: 85.36 },
  JED: { name: 'Jeddah', lat: 21.68, lon: 39.16 },
  RUH: { name: 'Riyadh', lat: 24.96, lon: 46.7 },
  CAI: { name: 'Cairo', lat: 30.12, lon: 31.41 },
  JNB: { name: 'Johannesburg', lat: -26.14, lon: 28.25 },
  NBO: { name: 'Nairobi', lat: -1.32, lon: 36.93 },
  ADD: { name: 'Addis Ababa', lat: 8.98, lon: 38.8 },
  ZRH: { name: 'Zurich', lat: 47.46, lon: 8.55 },
  MUC: { name: 'Munich', lat: 48.35, lon: 11.79 },
  MAD: { name: 'Madrid', lat: 40.47, lon: -3.56 },
  BCN: { name: 'Barcelona', lat: 41.3, lon: 2.08 },
  FCO: { name: 'Rome', lat: 41.8, lon: 12.24 },
  VIE: { name: 'Vienna', lat: 48.11, lon: 16.57 },
  CPH: { name: 'Copenhagen', lat: 55.62, lon: 12.65 },
  ARN: { name: 'Stockholm', lat: 59.65, lon: 17.92 },
  HEL: { name: 'Helsinki', lat: 60.32, lon: 24.96 },
  SFO: { name: 'San Francisco', lat: 37.62, lon: -122.38 },
  ORD: { name: 'Chicago', lat: 41.97, lon: -87.91 },
  YYZ: { name: 'Toronto', lat: 43.68, lon: -79.63 },
  YVR: { name: 'Vancouver', lat: 49.19, lon: -123.18 },
  GRU: { name: 'Sao Paulo', lat: -23.43, lon: -46.47 },
  MEX: { name: 'Mexico City', lat: 19.44, lon: -99.07 },
  HNL: { name: 'Honolulu', lat: 21.32, lon: -157.92 },
};
const CODES = Object.keys(AIRPORTS);

const AIRLINES = [
  'SQ', 'MH', 'AK', 'TR', 'TG', 'EK', 'QR', 'EY', 'CX', 'KE', 'OZ', 'JL',
  'NH', 'QF', 'BA', 'LH', 'AF', 'KL', 'TK', 'UA', 'AA', 'DL', 'GA', 'VN',
  'PR', 'CI', '6E', 'SV', 'ET', 'KQ',
];

// commercial airliners only — the fleet fits the stage length
function fleetFor(nm) {
  if (nm < 450) return ['AT76', 'DH8D', 'E190', 'A220'];
  if (nm < 2600) return ['A320', 'A20N', 'A321', 'B738', 'B38M', 'E195'];
  return ['A333', 'A359', 'B772', 'B77W', 'B788', 'B789', 'A388', 'B748'];
}

// ---------- geo ----------

const rad = (deg) => (deg * Math.PI) / 180;
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function initialBearing(a, b) {
  const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function gcDistNm(a, b) {
  const p1 = rad(a.lat), p2 = rad(b.lat);
  const dp = rad(b.lat - a.lat), dl = rad(b.lon - a.lon);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(h)) * 3440.065;
}

const lerpAngle = (a, b, maxStep) => {
  const d = ((b - a + 540) % 360) - 180;
  if (Math.abs(d) <= maxStep) return b;
  return (a + Math.sign(d) * maxStep + 360) % 360;
};
const angDiff = (a, b) => Math.abs(((b - a + 540) % 360) - 180);
const bearingTo = (from, to) => (Math.atan2(to.x - from.x, to.y - from.y) * 180 / Math.PI + 360) % 360;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const jitter = (deg) => (Math.random() - 0.5) * 2 * deg;

// ---------- the radar site ----------

let hub = 'KUL';
let RWY_HDG = 140;
const FAF_DIST = 9;
let FAF = { x: 0, y: 0 };

function rwyLabel() {
  const r1 = Math.round(RWY_HDG / 10) % 36 || 36;
  const r2 = (r1 + 18) % 36 || 36;
  return String(Math.min(r1, r2)).padStart(2, '0') + '/' + String(Math.max(r1, r2)).padStart(2, '0');
}

function freqFor(code) {
  let s = 0;
  for (const c of code) s += c.charCodeAt(0);
  return `${118 + (s % 18)}.${[1, 3, 5, 7, 9][s % 5]}`;
}

// a decorative video map (fictional — the traffic is the real geography)
const COAST = [
  [-78, 26], [-62, 18], [-50, 14], [-42, 4], [-38, -8], [-30, -18],
  [-18, -26], [-8, -38], [-2, -52], [4, -66], [10, -80],
];
const ISLANDS = [
  { x: -46, y: -18, r: 3.2 }, { x: -34, y: -30, r: 2.1 }, { x: -55, y: -2, r: 1.6 },
];
const WAYPOINTS = [
  { name: 'KADAX', x: -30, y: 44 }, { name: 'GUPTA', x: 46, y: 26 },
  { name: 'SALAX', x: 24, y: -48 }, { name: 'VPK', x: -52, y: -10 },
  { name: 'ENREP', x: 62, y: -18 },
];
const RESTRICTED = { name: 'R-204', x: 34, y: -32, r: 9 };

// ---------- traffic ----------

let aircraft = [];
let selected = null;

const makeCallsign = () => rand(AIRLINES) + String(100 + Math.floor(Math.random() * 900));
const randCity = () => {
  let c;
  do { c = rand(CODES); } while (c === hub);
  return c;
};

function spawnArrival() {
  const origin = randCity();
  const routeNm = gcDistNm(AIRPORTS[hub], AIRPORTS[origin]);
  // it arrives from where that city really is
  const brg = initialBearing(AIRPORTS[hub], AIRPORTS[origin]) + jitter(10);
  const d = 70 + Math.random() * 20;
  const pos = { x: d * Math.sin(rad(brg)), y: d * Math.cos(rad(brg)) };
  return {
    callsign: makeCallsign(), type: rand(fleetFor(routeNm)),
    origin, dest: hub, kind: 'ARR',
    pos, heading: bearingTo(pos, FAF),
    speed: 280 + Math.random() * 40,
    alt: 14000 + Math.random() * 10000,
    phase: 'descent', trail: [], paint: null, goneAt: 0,
  };
}

function spawnDeparture() {
  const dest = randCity();
  const routeNm = gcDistNm(AIRPORTS[hub], AIRPORTS[dest]);
  return {
    callsign: makeCallsign(), type: rand(fleetFor(routeNm)),
    origin: hub, dest, kind: 'DEP',
    pos: { x: 0, y: 0 }, heading: RWY_HDG,
    speed: 160,
    alt: 500,
    // then it turns on course for where it's actually going
    assigned: (initialBearing(AIRPORTS[hub], AIRPORTS[dest]) + jitter(8) + 360) % 360,
    cruise: routeNm < 450 ? 9000 + Math.random() * 6000 : 14000 + Math.random() * 12000,
    phase: 'climb', trail: [], paint: null, goneAt: 0,
  };
}

function spawnTransit() {
  // an overflight: in from one city's direction, out toward another's
  for (let tries = 0; tries < 14; tries++) {
    const origin = randCity();
    const dest = randCity();
    if (origin === dest) continue;
    const bIn = initialBearing(AIRPORTS[hub], AIRPORTS[origin]);
    const bOut = initialBearing(AIRPORTS[hub], AIRPORTS[dest]);
    if (angDiff(bIn, bOut) < 80) continue; // must actually cross the scope
    const brg = bIn + jitter(8);
    const pos = { x: 88 * Math.sin(rad(brg)), y: 88 * Math.cos(rad(brg)) };
    const exitBrg = bOut + jitter(8);
    const exit = { x: 96 * Math.sin(rad(exitBrg)), y: 96 * Math.cos(rad(exitBrg)) };
    const routeNm = gcDistNm(AIRPORTS[origin], AIRPORTS[dest]);
    return {
      callsign: makeCallsign(), type: rand(fleetFor(Math.max(routeNm, 500))),
      origin, dest, kind: 'TRN',
      pos, heading: bearingTo(pos, exit), exit,
      speed: 400 + Math.random() * 80,
      alt: 29000 + Math.random() * 11000,
      phase: 'cruise', trail: [], paint: null, goneAt: 0,
    };
  }
  return spawnArrival(); // couldn't find a crossing pair; more arrivals never hurt
}

function topUpTraffic() {
  const live = aircraft.filter((a) => !a.goneAt).length;
  if (live >= 12) return;
  const r = Math.random();
  aircraft.push(r < 0.5 ? spawnArrival() : r < 0.8 ? spawnDeparture() : spawnTransit());
}

function seedTraffic() {
  aircraft = [];
  for (let i = 0; i < 9; i++) topUpTraffic();
  // let arrivals start partway in so the scope isn't empty at the edges
  for (const a of aircraft) {
    if (a.kind === 'ARR') {
      const f = 0.3 + Math.random() * 0.6;
      a.pos.x *= f;
      a.pos.y *= f;
      a.alt *= 0.4 + f * 0.6;
    }
  }
}

function stepAircraft(a, dt) {
  if (a.goneAt) return;
  const turn = 3 * dt; // standard rate, in accelerated time

  if (a.kind === 'ARR') {
    const dField = dist(a.pos, { x: 0, y: 0 });
    if (a.phase === 'descent') {
      a.heading = lerpAngle(a.heading, bearingTo(a.pos, FAF), turn);
      const targetAlt = Math.max(3000, dist(a.pos, FAF) * 280 + 3000);
      a.alt = Math.max(3000, Math.min(a.alt, a.alt - Math.min(a.alt - targetAlt, 35 * dt)));
      if (a.speed > 210) a.speed -= 2 * dt;
      if (dist(a.pos, FAF) < 2.5) a.phase = 'final';
    } else {
      // down the ILS
      a.heading = lerpAngle(a.heading, bearingTo(a.pos, { x: 0, y: 0 }), turn * 2);
      a.alt = Math.max(0, dField * 310);
      if (a.speed > 135) a.speed -= 6 * dt;
      if (dField < 0.6) {
        a.phase = 'landed';
        a.goneAt = performance.now() + 6000;
        if (selected === a) selected = null;
      }
    }
  } else if (a.kind === 'DEP') {
    if (a.speed < 300) a.speed += 8 * dt;
    if (a.alt < a.cruise) a.alt = Math.min(a.cruise, a.alt + 45 * dt);
    const dField = dist(a.pos, { x: 0, y: 0 });
    if (dField > 4) a.heading = lerpAngle(a.heading, a.assigned, turn);
    if (dField > 95) {
      a.phase = 'departed';
      a.goneAt = performance.now() + 6000;
      if (selected === a) selected = null;
    }
  } else {
    a.heading = lerpAngle(a.heading, bearingTo(a.pos, a.exit), turn * 0.5);
    if (dist(a.pos, { x: 0, y: 0 }) > 95) {
      a.phase = 'departed';
      a.goneAt = performance.now() + 1;
      if (selected === a) selected = null;
    }
  }

  const nmps = a.speed / 3600;
  a.pos.x += Math.sin(rad(a.heading)) * nmps * dt;
  a.pos.y += Math.cos(rad(a.heading)) * nmps * dt;
}

// ---------- scope geometry ----------

let cx = 0, cy = 0, scopeR = 0;
const pxPerNm = () => scopeR / range;
const toScreen = (p) => ({ x: cx + p.x * pxPerNm(), y: cy - p.y * pxPerNm() });

// ---------- static underlay (rings, map, runway) ----------

let staticLayer = null;

function buildStatic() {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * DPR);
  c.height = Math.ceil(W * DPR);
  const g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const px = pxPerNm();
  const sxy = (x, y) => ({ x: cx + x * px, y: cy - y * px });

  // tube
  g.fillStyle = '#0b1210';
  g.beginPath();
  g.arc(cx, cy, scopeR, 0, Math.PI * 2);
  g.fill();

  g.save();
  g.beginPath();
  g.arc(cx, cy, scopeR, 0, Math.PI * 2);
  g.clip();
  g.font = '10px ui-monospace, Menlo, monospace';

  // coastline
  g.strokeStyle = 'rgba(57,224,122,0.28)';
  g.lineWidth = 1.5;
  g.beginPath();
  COAST.forEach(([x, y], i) => {
    const s = sxy(x, y);
    i ? g.lineTo(s.x, s.y) : g.moveTo(s.x, s.y);
  });
  g.stroke();
  for (const isl of ISLANDS) {
    const s = sxy(isl.x, isl.y);
    g.beginPath();
    g.arc(s.x, s.y, isl.r * px, 0, Math.PI * 2);
    g.stroke();
  }

  // restricted area
  const rs = sxy(RESTRICTED.x, RESTRICTED.y);
  g.strokeStyle = 'rgba(201,86,77,0.4)';
  g.setLineDash([5, 5]);
  g.beginPath();
  g.arc(rs.x, rs.y, RESTRICTED.r * px, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(201,86,77,0.5)';
  g.fillText(RESTRICTED.name, rs.x - 14, rs.y);

  // waypoints
  g.strokeStyle = 'rgba(57,224,122,0.4)';
  g.fillStyle = 'rgba(57,224,122,0.45)';
  g.lineWidth = 1;
  for (const wp of WAYPOINTS) {
    const s = sxy(wp.x, wp.y);
    g.beginPath();
    g.moveTo(s.x, s.y - 5);
    g.lineTo(s.x + 5, s.y + 4);
    g.lineTo(s.x - 5, s.y + 4);
    g.closePath();
    g.stroke();
    g.fillText(wp.name, s.x + 8, s.y + 4);
  }

  // range rings
  g.strokeStyle = 'rgba(57,224,122,0.22)';
  g.fillStyle = 'rgba(57,224,122,0.5)';
  const step = range / 4;
  for (let i = 1; i <= 3; i++) {
    g.beginPath();
    g.arc(cx, cy, i * step * px, 0, Math.PI * 2);
    g.stroke();
    g.fillText(String(i * step), cx + 4, cy - i * step * px + 12);
  }

  // compass ticks
  for (let d = 0; d < 360; d += 10) {
    const major = d % 30 === 0;
    const a = rad(d);
    const r0 = scopeR - (major ? 12 : 6);
    g.strokeStyle = `rgba(57,224,122,${major ? 0.5 : 0.3})`;
    g.beginPath();
    g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
    g.lineTo(cx + Math.sin(a) * scopeR, cy - Math.cos(a) * scopeR);
    g.stroke();
    if (major) {
      const rt = scopeR - 24;
      g.fillStyle = 'rgba(57,224,122,0.55)';
      g.textAlign = 'center';
      g.fillText(String(d).padStart(3, '0'), cx + Math.sin(a) * rt, cy - Math.cos(a) * rt + 4);
      g.textAlign = 'left';
    }
  }

  // the field: runway in use plus the final approach course
  const rwyLen = Math.max(2.2 * px, 12);
  const ra = rad(RWY_HDG);
  g.strokeStyle = 'rgba(57,224,122,0.9)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - Math.sin(ra) * rwyLen / 2, cy + Math.cos(ra) * rwyLen / 2);
  g.lineTo(cx + Math.sin(ra) * rwyLen / 2, cy - Math.cos(ra) * rwyLen / 2);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(57,224,122,0.35)';
  g.setLineDash([6, 8]);
  const faf = sxy(FAF.x, FAF.y);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(faf.x, faf.y);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(57,224,122,0.6)';
  g.fillText(`${hub} ${rwyLabel()}`, cx + 8, cy + 16);

  g.restore();

  // bezel
  g.strokeStyle = '#23282f';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, scopeR, 0, Math.PI * 2);
  g.stroke();

  staticLayer = c;
}

// ---------- weather ----------

let wxCells = [];

function makeWeather() {
  wxCells = [];
  for (let i = 0; i < 3; i++) {
    const cxNm = (Math.random() - 0.5) * 120;
    const cyNm = (Math.random() - 0.5) * 120;
    const blobs = [];
    for (let b = 0; b < 7; b++) {
      blobs.push({
        x: cxNm + (Math.random() - 0.5) * 16,
        y: cyNm + (Math.random() - 0.5) * 12,
        r: 2.5 + Math.random() * 5,
      });
    }
    wxCells.push({ blobs, dx: (Math.random() - 0.5) * 0.006, dy: (Math.random() - 0.5) * 0.006 });
  }
}

function drawWeather(dt) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(57,224,122,0.10)';
  for (const cell of wxCells) {
    for (const b of cell.blobs) {
      b.x += cell.dx * dt;
      b.y += cell.dy * dt;
      const s = toScreen(b);
      ctx.beginPath();
      ctx.arc(s.x, s.y, b.r * pxPerNm(), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // dither so it reads as precip, not paint
  ctx.fillStyle = 'rgba(57,224,122,0.16)';
  for (const cell of wxCells) {
    for (const b of cell.blobs) {
      for (let i = 0; i < 6; i++) {
        const s = toScreen({
          x: b.x + (Math.random() - 0.5) * b.r * 1.6,
          y: b.y + (Math.random() - 0.5) * b.r * 1.6,
        });
        ctx.fillRect(s.x, s.y, 2, 2);
      }
    }
  }
  ctx.restore();
}

// ---------- the sweep ----------

let sweep = 0;      // radians clockwise from north
let prevSweep = 0;

function bearingRad(p) {
  return (Math.atan2(p.x, p.y) + Math.PI * 2) % (Math.PI * 2);
}

function sweptOver(brg) {
  if (prevSweep <= sweep) return brg > prevSweep && brg <= sweep;
  return brg > prevSweep || brg <= sweep; // wrapped past north
}

function drawSweep() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR, 0, Math.PI * 2);
  ctx.clip();
  if (ctx.createConicGradient) {
    // fading wedge behind the beam; the gradient runs clockwise from the
    // beam, so the trail sits just before offset 1
    const grad = ctx.createConicGradient(sweep - Math.PI / 2, cx, cy);
    grad.addColorStop(0, 'rgba(57,224,122,0)');
    grad.addColorStop(0.72, 'rgba(57,224,122,0)');
    grad.addColorStop(1, 'rgba(57,224,122,0.30)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - scopeR, cy - scopeR, scopeR * 2, scopeR * 2);
  } else {
    // sector-fan fallback for browsers without conic gradients (older iOS)
    const segs = 28, span = Math.PI * 0.55;
    for (let i = 0; i < segs; i++) {
      const a0 = sweep - (span * (i + 1)) / segs - Math.PI / 2;
      const a1 = sweep - (span * i) / segs - Math.PI / 2;
      ctx.fillStyle = `rgba(57,224,122,${0.28 * (1 - i / segs)})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, scopeR, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
  }
  // the beam itself
  ctx.strokeStyle = 'rgba(140,255,180,0.8)';
  ctx.lineWidth = 2;
  ctx.shadowColor = PHOS;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(sweep) * scopeR, cy - Math.cos(sweep) * scopeR);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ---------- blips ----------

function paintBrightness(brg) {
  // 1 right after the beam passes, decaying until it comes around again
  const behind = (sweep - brg + Math.PI * 2) % (Math.PI * 2);
  return Math.pow(1 - behind / (Math.PI * 2), 1.6);
}

function drawAircraft() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR, 0, Math.PI * 2);
  ctx.clip();
  ctx.font = `${Math.max(10, scopeR * 0.026)}px ui-monospace, Menlo, monospace`;

  for (const a of aircraft) {
    if (a.goneAt) continue;
    const brg = bearingRad(a.pos);
    if (sweptOver(brg)) {
      a.paint = { x: a.pos.x, y: a.pos.y, alt: a.alt, speed: a.speed };
      a.trail.unshift({ x: a.pos.x, y: a.pos.y });
      if (a.trail.length > 7) a.trail.pop();
      if (soundOn && a === selected) pip(1320, 0.05, 0.06);
    }
    if (!a.paint) continue; // not acquired yet

    const b = Math.max(0.18, paintBrightness(bearingRad(a.paint)));
    const s = toScreen(a.paint);
    const isSel = a === selected;

    if (showTrails) {
      a.trail.forEach((tp, i) => {
        if (i === 0) return;
        const ts = toScreen(tp);
        ctx.fillStyle = `rgba(57,224,122,${b * 0.5 * (1 - i / a.trail.length)})`;
        ctx.fillRect(ts.x - 1.5, ts.y - 1.5, 3, 3);
      });
    }

    // the blip
    ctx.fillStyle = isSel ? `rgba(255,184,77,${0.35 + 0.65 * b})` : `rgba(57,224,122,${0.3 + 0.7 * b})`;
    ctx.shadowColor = isSel ? '#ffb84d' : PHOS;
    ctx.shadowBlur = 10 * b;
    ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    ctx.shadowBlur = 0;
    if (isSel) {
      ctx.strokeStyle = `rgba(255,184,77,${0.4 + 0.5 * b})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
      ctx.stroke();
    }

    // data block
    if (showLabels || isSel) {
      const fl = String(Math.round(a.paint.alt / 100)).padStart(3, '0');
      const arrow = a.kind === 'ARR' || a.phase === 'final' ? '↓' : a.kind === 'DEP' && a.paint.alt < (a.cruise || 0) ? '↑' : ' ';
      const spd = String(Math.round(a.paint.speed / 10)).padStart(2, '0');
      const lx = s.x + 14, ly = s.y - 10;
      ctx.strokeStyle = `rgba(57,224,122,${0.35 * b})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x + 4, s.y - 4);
      ctx.lineTo(lx - 2, ly + 3);
      ctx.stroke();
      ctx.fillStyle = isSel ? `rgba(255,184,77,${0.4 + 0.6 * b})` : `rgba(57,224,122,${0.35 + 0.65 * b})`;
      ctx.fillText(a.callsign, lx, ly);
      ctx.fillText(`${fl}${arrow} ${spd}`, lx, ly + Math.max(11, scopeR * 0.028));
    }
  }
  ctx.restore();
}

// ---------- frame loop ----------

let last = 0;

function frame(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;
  const simDt = dt * TIME_ACCEL;

  prevSweep = sweep;
  sweep = (sweep + (dt * Math.PI * 2) / SWEEP_PERIOD) % (Math.PI * 2);
  if (soundOn && prevSweep > sweep) pip(660, 0.5, 0.05); // once past north

  for (const a of aircraft) stepAircraft(a, simDt);
  const now = performance.now();
  const before = aircraft.length;
  aircraft = aircraft.filter((a) => !a.goneAt || now < a.goneAt);
  if (before !== aircraft.length) renderStrips();

  ctx.clearRect(0, 0, W, W);
  ctx.drawImage(staticLayer, 0, 0, W, W);
  if (showWx) drawWeather(simDt);
  drawSweep();
  drawAircraft();

  requestAnimationFrame(frame);
}

// ---------- flight strips ----------

const striplist = document.getElementById('striplist');

const PHASE_LABEL = {
  descent: 'DESCENT', final: 'FINAL', landed: 'LANDED',
  climb: 'CLIMB', cruise: 'CRUISE', departed: 'DEPARTED',
};

function renderStrips() {
  striplist.textContent = '';
  const order = { ARR: 0, DEP: 1, TRN: 2 };
  const sorted = [...aircraft].sort((a, b) => order[a.kind] - order[b.kind]);
  for (const a of sorted) {
    const div = document.createElement('div');
    div.className = 'strip' + (a === selected ? ' sel' : '');
    const gone = a.phase === 'landed' || a.phase === 'departed';
    div.innerHTML =
      `<span class="cs">${a.callsign}</span>` +
      `<span class="meta">${a.kind} FL${String(Math.round(a.alt / 100)).padStart(3, '0')}</span>` +
      `<br><span class="rte">${a.type} ${a.origin}→${a.dest} ` +
      `<span class="${gone ? 'gone' : ''}">${PHASE_LABEL[a.phase] || ''}</span></span>`;
    div.addEventListener('click', () => {
      selected = selected === a ? null : a;
      renderStrips();
    });
    striplist.appendChild(div);
  }
}

setInterval(renderStrips, 1000);
setInterval(topUpTraffic, 3000);

// ---------- selection by click ----------

const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let best = null, bestD = coarsePointer ? 30 : 18; // fat fingers get a fat hitbox
  for (const a of aircraft) {
    if (!a.paint || a.goneAt) continue;
    const s = toScreen(a.paint);
    const d = Math.hypot(s.x - mx, s.y - my);
    if (d < bestD) { best = a; bestD = d; }
  }
  selected = best === selected ? null : best;
  renderStrips();
});

// ---------- sound ----------

let ac = null, humGain = null;
let soundOn = false;

function ensureAudio() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let lastS = 0;
  for (let i = 0; i < len; i++) {
    lastS = (lastS + 0.015 * (Math.random() * 2 - 1)) / 1.015;
    d[i] = lastS * 3;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 140;
  humGain = ac.createGain();
  humGain.gain.value = 0;
  src.connect(f).connect(humGain).connect(ac.destination);
  src.start();
}

function pip(freq, decay, vol) {
  if (!ac) return;
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + decay);
  o.connect(g).connect(ac.destination);
  o.start();
  o.stop(ac.currentTime + decay);
}

// ---------- controls ----------

const hubSel = document.getElementById('hub');
const rangeBtn = document.getElementById('range');
const labelsBtn = document.getElementById('labels');
const trailsBtn = document.getElementById('trails');
const wxBtn = document.getElementById('wx');
const soundBtn = document.getElementById('sound');
const freqEl = document.getElementById('freq');

for (const code of CODES) {
  if (!AIRPORTS[code].hub) continue;
  const opt = document.createElement('option');
  opt.value = code;
  opt.textContent = `${code} · ${AIRPORTS[code].name}`;
  hubSel.appendChild(opt);
}

function syncURL() {
  history.replaceState(null, '', '?hub=' + hub);
}

function setHub(code) {
  hub = code;
  RWY_HDG = AIRPORTS[hub].rwy % 360;
  FAF = {
    x: FAF_DIST * Math.sin(rad(RWY_HDG + 180)),
    y: FAF_DIST * Math.cos(rad(RWY_HDG + 180)),
  };
  freqEl.textContent = `${hub} APP ${freqFor(hub)}`;
  hubSel.value = hub;
  selected = null;
  seedTraffic();
  if (W) buildStatic();
  renderStrips();
}

hubSel.addEventListener('change', () => {
  setHub(hubSel.value);
  syncURL();
});

rangeBtn.addEventListener('click', () => {
  range = RANGES[(RANGES.indexOf(range) + 1) % RANGES.length];
  rangeBtn.textContent = `RNG ${range} NM`;
  buildStatic();
});

labelsBtn.addEventListener('click', () => {
  showLabels = !showLabels;
  labelsBtn.setAttribute('aria-pressed', String(showLabels));
});

trailsBtn.addEventListener('click', () => {
  showTrails = !showTrails;
  trailsBtn.setAttribute('aria-pressed', String(showTrails));
});

wxBtn.addEventListener('click', () => {
  showWx = !showWx;
  if (showWx && wxCells.length === 0) makeWeather();
  wxBtn.setAttribute('aria-pressed', String(showWx));
});

soundBtn.addEventListener('click', () => {
  ensureAudio();
  ac.resume();
  soundOn = !soundOn;
  humGain.gain.setTargetAtTime(soundOn ? 0.05 : 0, ac.currentTime, 0.3);
  soundBtn.textContent = (soundOn ? '\u{1F50A}' : '\u{1F507}') + ' sound';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'r') rangeBtn.click();
  else if (e.key === 'l') labelsBtn.click();
  else if (e.key === 't') trailsBtn.click();
  else if (e.key === 'w') wxBtn.click();
  else if (e.key === 's') soundBtn.click();
});

// ---------- clock ----------

const clockEl = document.getElementById('clock');
function updateClock() {
  const d = new Date();
  clockEl.textContent =
    String(d.getUTCHours()).padStart(2, '0') + ':' +
    String(d.getUTCMinutes()).padStart(2, '0') + ':' +
    String(d.getUTCSeconds()).padStart(2, '0') + 'Z';
}
updateClock();
setInterval(updateClock, 1000);

// ---------- boot ----------

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const rect = wrap.getBoundingClientRect();
  W = Math.min(rect.width, rect.height);
  canvas.width = Math.ceil(W * DPR);
  canvas.height = Math.ceil(W * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = W + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  cx = W / 2;
  cy = W / 2;
  scopeR = W / 2 - 8;
  buildStatic();
}

const params = new URLSearchParams(location.search);
const startHub = params.get('hub');
setHub(startHub && AIRPORTS[startHub] && AIRPORTS[startHub].hub ? startHub : 'KUL');

window.addEventListener('resize', resize);
resize();
renderStrips();
requestAnimationFrame(frame);
