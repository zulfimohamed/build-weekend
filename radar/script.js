'use strict';

// An ATC-game-style airport: approach radar, ground radar, timetable, and a
// controller sidebar. Every flight is a real route flown by the airline that
// actually flies it, with plausible equipment, and lives a full lifecycle:
// descend → final → land → taxi in → gate, or board → pushback → taxi out →
// take off → climb away on the true bearing of its destination.

// ---------- shared state ----------

let range = 40;              // NM from center to scope edge
const RANGES = [20, 40, 80];
let showLabels = true;
let showTrails = true;
let showWx = false;
let view = 'live';           // 'live' (flight-radar vibe) | 'scope' (paint-on-beam)
let tab = 'app';             // 'ground' | 'app' | 'time'

const TIME_ACCEL = 8;        // the shift goes faster here
const SWEEP_PERIOD = 4;      // seconds per sweep rotation
const PHOS = '#39e07a';

const rad = (deg) => (deg * Math.PI) / 180;
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const lerpAngle = (a, b, maxStep) => {
  const d = ((b - a + 540) % 360) - 180;
  if (Math.abs(d) <= maxStep) return b;
  return (a + Math.sign(d) * maxStep + 360) % 360;
};
const angDiff = (a, b) => Math.abs(((b - a + 540) % 360) - 180);
const bearingTo = (from, to) => (Math.atan2(to.x - from.x, to.y - from.y) * 180 / Math.PI + 360) % 360;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const jitter = (deg) => (Math.random() - 0.5) * 2 * deg;

// ---------- the world ----------

const AIRPORTS = {
  KUL: { name: 'Kuala Lumpur', lat: 2.74, lon: 101.71, rwy: 140, hub: true },
  SIN: { name: 'Singapore', lat: 1.36, lon: 103.99, rwy: 23, hub: true },
  DXB: { name: 'Dubai', lat: 25.25, lon: 55.36, rwy: 122, hub: true },
  LHR: { name: 'London Heathrow', lat: 51.47, lon: -0.45, rwy: 270, hub: true },
  JFK: { name: 'New York JFK', lat: 40.64, lon: -73.78, rwy: 223, hub: true },
  HND: { name: 'Tokyo Haneda', lat: 35.55, lon: 139.78, rwy: 337, hub: true },

  BKK: { name: 'Bangkok', lat: 13.69, lon: 100.75 },
  HKG: { name: 'Hong Kong', lat: 22.31, lon: 113.91 },
  ICN: { name: 'Seoul Incheon', lat: 37.46, lon: 126.44 },
  DOH: { name: 'Doha', lat: 25.27, lon: 51.61 },
  AUH: { name: 'Abu Dhabi', lat: 24.43, lon: 54.65 },
  IST: { name: 'Istanbul', lat: 41.26, lon: 28.74 },
  FRA: { name: 'Frankfurt', lat: 50.03, lon: 8.57 },
  CDG: { name: 'Paris CDG', lat: 49.01, lon: 2.55 },
  AMS: { name: 'Amsterdam', lat: 52.31, lon: 4.76 },
  LAX: { name: 'Los Angeles', lat: 33.94, lon: -118.41 },
  SYD: { name: 'Sydney', lat: -33.95, lon: 151.18 },
  NRT: { name: 'Tokyo Narita', lat: 35.77, lon: 140.39 },
  KIX: { name: 'Osaka', lat: 34.43, lon: 135.24 },
  CTS: { name: 'Sapporo', lat: 42.78, lon: 141.69 },
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
  JED: { name: 'Jeddah', lat: 21.68, lon: 39.16 },
  RUH: { name: 'Riyadh', lat: 24.96, lon: 46.7 },
  CAI: { name: 'Cairo', lat: 30.12, lon: 31.41 },
  ZRH: { name: 'Zurich', lat: 47.46, lon: 8.55 },
  MAD: { name: 'Madrid', lat: 40.47, lon: -3.56 },
  SFO: { name: 'San Francisco', lat: 37.62, lon: -122.38 },
  ORD: { name: 'Chicago', lat: 41.97, lon: -87.91 },
  YYZ: { name: 'Toronto', lat: 43.68, lon: -79.63 },
  HNL: { name: 'Honolulu', lat: 21.32, lon: -157.92 },
};
const CODES = Object.keys(AIRPORTS);

// Real routes: [ICAO callsign prefix, airline, city, typical equipment].
// Arrivals fly them inbound, departures outbound.
const ROUTES = {
  KUL: [
    ['MAS', 'Malaysia Airlines', 'LHR', 'A359'],
    ['MAS', 'Malaysia Airlines', 'NRT', 'A333'],
    ['MAS', 'Malaysia Airlines', 'SYD', 'A333'],
    ['MAS', 'Malaysia Airlines', 'SIN', 'B738'],
    ['MAS', 'Malaysia Airlines', 'HKG', 'B738'],
    ['MAS', 'Malaysia Airlines', 'BKI', 'B738'],
    ['AXM', 'AirAsia', 'SIN', 'A320'],
    ['AXM', 'AirAsia', 'BKK', 'A320'],
    ['AXM', 'AirAsia', 'CGK', 'A320'],
    ['AXM', 'AirAsia', 'DPS', 'A320'],
    ['AXM', 'AirAsia', 'PEN', 'A320'],
    ['AXM', 'AirAsia', 'LGK', 'A320'],
    ['AXM', 'AirAsia', 'SGN', 'A320'],
    ['AXM', 'AirAsia', 'MNL', 'A320'],
    ['XAX', 'AirAsia X', 'ICN', 'A333'],
    ['XAX', 'AirAsia X', 'KIX', 'A333'],
    ['SIA', 'Singapore Airlines', 'SIN', 'B738'],
    ['UAE', 'Emirates', 'DXB', 'B77W'],
    ['QTR', 'Qatar Airways', 'DOH', 'A359'],
    ['ETD', 'Etihad Airways', 'AUH', 'B789'],
    ['CPA', 'Cathay Pacific', 'HKG', 'A333'],
    ['ANA', 'All Nippon Airways', 'HND', 'B789'],
    ['JAL', 'Japan Airlines', 'NRT', 'B788'],
    ['KAL', 'Korean Air', 'ICN', 'A333'],
    ['THA', 'Thai Airways', 'BKK', 'A320'],
    ['GIA', 'Garuda Indonesia', 'CGK', 'B738'],
    ['CES', 'China Eastern', 'PVG', 'A321'],
    ['UAL', 'United Airlines', 'SFO', 'B789'],
    ['BTK', 'Batik Air', 'PEN', 'B738'],
    ['THY', 'Turkish Airlines', 'IST', 'A359'],
  ],
  SIN: [
    ['SIA', 'Singapore Airlines', 'LHR', 'A388'],
    ['SIA', 'Singapore Airlines', 'SYD', 'A388'],
    ['SIA', 'Singapore Airlines', 'HKG', 'A359'],
    ['SIA', 'Singapore Airlines', 'NRT', 'B77W'],
    ['SIA', 'Singapore Airlines', 'KUL', 'B738'],
    ['SIA', 'Singapore Airlines', 'CGK', 'B738'],
    ['SIA', 'Singapore Airlines', 'JFK', 'A359'],
    ['TGW', 'Scoot', 'BKK', 'A320'],
    ['TGW', 'Scoot', 'DPS', 'A320'],
    ['TGW', 'Scoot', 'PER', 'B788'],
    ['TGW', 'Scoot', 'TPE', 'B788'],
    ['JSA', 'Jetstar Asia', 'BKK', 'A320'],
    ['JSA', 'Jetstar Asia', 'MNL', 'A320'],
    ['MAS', 'Malaysia Airlines', 'KUL', 'B738'],
    ['AXM', 'AirAsia', 'KUL', 'A320'],
    ['QTR', 'Qatar Airways', 'DOH', 'A388'],
    ['UAE', 'Emirates', 'DXB', 'A388'],
    ['BAW', 'British Airways', 'LHR', 'B77W'],
    ['QFA', 'Qantas', 'SYD', 'A388'],
    ['QFA', 'Qantas', 'LHR', 'B789'],
    ['GIA', 'Garuda Indonesia', 'CGK', 'B738'],
    ['ANA', 'All Nippon Airways', 'HND', 'B789'],
    ['KLM', 'KLM', 'AMS', 'B77W'],
    ['AFR', 'Air France', 'CDG', 'B77W'],
    ['CPA', 'Cathay Pacific', 'HKG', 'A359'],
    ['THA', 'Thai Airways', 'BKK', 'A359'],
    ['VJC', 'VietJet Air', 'SGN', 'A321'],
    ['AIC', 'Air India', 'DEL', 'A320'],
    ['SQC', 'Singapore Airlines Cargo', 'HKG', 'B748'],
  ],
  DXB: [
    ['UAE', 'Emirates', 'LHR', 'A388'],
    ['UAE', 'Emirates', 'JFK', 'A388'],
    ['UAE', 'Emirates', 'SIN', 'B77W'],
    ['UAE', 'Emirates', 'SYD', 'A388'],
    ['UAE', 'Emirates', 'BOM', 'B77W'],
    ['UAE', 'Emirates', 'BKK', 'A388'],
    ['UAE', 'Emirates', 'HKG', 'B77W'],
    ['UAE', 'Emirates', 'KUL', 'A388'],
    ['UAE', 'Emirates', 'CGK', 'B77W'],
    ['UAE', 'Emirates', 'ICN', 'B77W'],
    ['FDB', 'flydubai', 'DOH', 'B738'],
    ['FDB', 'flydubai', 'JED', 'B738'],
    ['FDB', 'flydubai', 'RUH', 'B738'],
    ['FDB', 'flydubai', 'CAI', 'B738'],
    ['BAW', 'British Airways', 'LHR', 'B789'],
    ['VIR', 'Virgin Atlantic', 'LHR', 'B789'],
    ['SIA', 'Singapore Airlines', 'SIN', 'A359'],
    ['AIC', 'Air India', 'DEL', 'A320'],
    ['AIC', 'Air India', 'BOM', 'A320'],
    ['DLH', 'Lufthansa', 'FRA', 'A359'],
    ['KLM', 'KLM', 'AMS', 'B77W'],
    ['THY', 'Turkish Airlines', 'IST', 'B77W'],
    ['MSR', 'EgyptAir', 'CAI', 'B738'],
    ['SVA', 'Saudia', 'JED', 'A320'],
    ['SVA', 'Saudia', 'RUH', 'A320'],
  ],
  LHR: [
    ['BAW', 'British Airways', 'JFK', 'B77W'],
    ['BAW', 'British Airways', 'LAX', 'A388'],
    ['BAW', 'British Airways', 'DXB', 'B789'],
    ['BAW', 'British Airways', 'SIN', 'B77W'],
    ['BAW', 'British Airways', 'HKG', 'B77W'],
    ['BAW', 'British Airways', 'DEL', 'B789'],
    ['BAW', 'British Airways', 'AMS', 'A320'],
    ['BAW', 'British Airways', 'CDG', 'A320'],
    ['BAW', 'British Airways', 'FRA', 'A320'],
    ['BAW', 'British Airways', 'MAD', 'A320'],
    ['BAW', 'British Airways', 'ZRH', 'A320'],
    ['VIR', 'Virgin Atlantic', 'JFK', 'A359'],
    ['VIR', 'Virgin Atlantic', 'LAX', 'B789'],
    ['AAL', 'American Airlines', 'JFK', 'B77W'],
    ['UAL', 'United Airlines', 'ORD', 'B788'],
    ['UAL', 'United Airlines', 'SFO', 'B77W'],
    ['DAL', 'Delta Air Lines', 'JFK', 'A333'],
    ['ACA', 'Air Canada', 'YYZ', 'B77W'],
    ['SIA', 'Singapore Airlines', 'SIN', 'A388'],
    ['UAE', 'Emirates', 'DXB', 'A388'],
    ['QTR', 'Qatar Airways', 'DOH', 'A359'],
    ['CPA', 'Cathay Pacific', 'HKG', 'A359'],
    ['ANA', 'All Nippon Airways', 'HND', 'B77W'],
    ['JAL', 'Japan Airlines', 'HND', 'B789'],
    ['KAL', 'Korean Air', 'ICN', 'B789'],
    ['MAS', 'Malaysia Airlines', 'KUL', 'A359'],
    ['QFA', 'Qantas', 'SIN', 'B789'],
    ['AFR', 'Air France', 'CDG', 'A220'],
    ['KLM', 'KLM', 'AMS', 'B738'],
    ['DLH', 'Lufthansa', 'FRA', 'A320'],
    ['SWR', 'Swiss', 'ZRH', 'A220'],
    ['AIC', 'Air India', 'DEL', 'B789'],
    ['THY', 'Turkish Airlines', 'IST', 'A359'],
  ],
  JFK: [
    ['AAL', 'American Airlines', 'LAX', 'A321'],
    ['AAL', 'American Airlines', 'SFO', 'A321'],
    ['AAL', 'American Airlines', 'LHR', 'B77W'],
    ['DAL', 'Delta Air Lines', 'LAX', 'A321'],
    ['DAL', 'Delta Air Lines', 'LHR', 'A333'],
    ['DAL', 'Delta Air Lines', 'CDG', 'A339'],
    ['JBU', 'JetBlue', 'LAX', 'A321'],
    ['JBU', 'JetBlue', 'SFO', 'A321'],
    ['BAW', 'British Airways', 'LHR', 'B77W'],
    ['VIR', 'Virgin Atlantic', 'LHR', 'A359'],
    ['UAE', 'Emirates', 'DXB', 'A388'],
    ['QTR', 'Qatar Airways', 'DOH', 'A359'],
    ['SIA', 'Singapore Airlines', 'SIN', 'A359'],
    ['KAL', 'Korean Air', 'ICN', 'B748'],
    ['JAL', 'Japan Airlines', 'HND', 'B77W'],
    ['ANA', 'All Nippon Airways', 'HND', 'B77W'],
    ['AFR', 'Air France', 'CDG', 'B77W'],
    ['DLH', 'Lufthansa', 'FRA', 'B748'],
    ['KLM', 'KLM', 'AMS', 'A333'],
    ['SWR', 'Swiss', 'ZRH', 'A333'],
    ['IBE', 'Iberia', 'MAD', 'A359'],
    ['THY', 'Turkish Airlines', 'IST', 'B77W'],
    ['ACA', 'Air Canada', 'YYZ', 'A220'],
  ],
  HND: [
    ['ANA', 'All Nippon Airways', 'CTS', 'B77W'],
    ['ANA', 'All Nippon Airways', 'LHR', 'B77W'],
    ['ANA', 'All Nippon Airways', 'LAX', 'B789'],
    ['ANA', 'All Nippon Airways', 'SFO', 'B77W'],
    ['ANA', 'All Nippon Airways', 'SIN', 'B789'],
    ['ANA', 'All Nippon Airways', 'BKK', 'B789'],
    ['JAL', 'Japan Airlines', 'CTS', 'B772'],
    ['JAL', 'Japan Airlines', 'LHR', 'B789'],
    ['JAL', 'Japan Airlines', 'HNL', 'B789'],
    ['JAL', 'Japan Airlines', 'BKK', 'B789'],
    ['SKY', 'Skymark Airlines', 'CTS', 'B738'],
    ['ADO', 'Air Do', 'CTS', 'B738'],
    ['SIA', 'Singapore Airlines', 'SIN', 'A359'],
    ['CPA', 'Cathay Pacific', 'HKG', 'A359'],
    ['UAE', 'Emirates', 'DXB', 'B77W'],
    ['QTR', 'Qatar Airways', 'DOH', 'B77W'],
    ['DAL', 'Delta Air Lines', 'LAX', 'A359'],
    ['UAL', 'United Airlines', 'SFO', 'B77W'],
    ['AAL', 'American Airlines', 'LAX', 'B789'],
    ['BAW', 'British Airways', 'LHR', 'B77W'],
    ['AFR', 'Air France', 'CDG', 'B77W'],
    ['HAL', 'Hawaiian Airlines', 'HNL', 'A333'],
    ['MAS', 'Malaysia Airlines', 'KUL', 'A333'],
  ],
};

const TRANSIT_AIRLINES = ['UAE', 'QTR', 'SIA', 'BAW', 'DLH', 'AFR', 'KLM', 'CPA', 'ANA', 'JAL', 'KAL', 'UAL', 'AAL', 'DAL', 'THA', 'MAS', 'ETD', 'THY'];
const WIDEBODIES = new Set(['A333', 'A339', 'A359', 'A388', 'B772', 'B77W', 'B788', 'B789', 'B748']);

// ---------- geo ----------

function initialBearing(a, b) {
  const p1 = rad(a.lat), p2 = rad(b.lat), dl = rad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ---------- the radar site ----------

let hub = 'KUL';
let RWY_HDG = 140;
const FAF_DIST = 12;
let FAF = { x: 0, y: 0 };
const ORIGIN = { x: 0, y: 0 };
const pt = (brgDeg, d) => ({ x: d * Math.sin(rad(brgDeg)), y: d * Math.cos(rad(brgDeg)) });

function rwyLabel() {
  const r1 = Math.round(RWY_HDG / 10) % 36 || 36;
  const r2 = (r1 + 18) % 36 || 36;
  return String(Math.min(r1, r2)).padStart(2, '0') + '/' + String(Math.max(r1, r2)).padStart(2, '0');
}

function hash(str) {
  let s = 0;
  for (const c of str) s = (s * 31 + c.charCodeAt(0)) % 9973;
  return s;
}

const FREQS = () => {
  const s = hash(hub);
  const dec = ['1', '3', '5', '7', '9'];
  return {
    approach: `12${s % 2}.${dec[(s + 3) % 5]}0`,
    tower: `118.${dec[s % 5]}0`,
    ground: `121.${dec[(s + 1) % 5]}5`,
    clearance: `119.${dec[(s + 2) % 5]}0`,
  };
};

// decorative video map for the scope
const COAST = [
  [-78, 26], [-62, 18], [-50, 14], [-42, 4], [-38, -8], [-30, -18],
  [-18, -26], [-8, -38], [-2, -52], [4, -66], [10, -80],
];
const WAYPOINTS = [
  { name: 'KADAX', x: -30, y: 44 }, { name: 'GUPTA', x: 46, y: 26 },
  { name: 'SALAX', x: 24, y: -48 }, { name: 'VPK', x: -52, y: -10 },
];

// ---------- ground layout (schematic, unit space 100 x 62) ----------

const G = {
  W: 100, H: 62,
  rwyY: 50, rwyX0: 8, rwyX1: 92,
  twyY: 40,
  gateY: 29,
  exits: [46, 74],       // high-speed exits off the runway
  entry: 14,             // taxi to the holding point here
  gates: [],
};
for (let i = 0; i < 8; i++) G.gates.push({ id: (i < 4 ? 'A' : 'B') + ((i % 4) + 1), x: 30 + i * 5.6, busy: null });

// ---------- flights ----------

let flights = [];
let selected = null;

const AIR_STATES = new Set(['descent', 'base', 'final', 'climb', 'cruise']);
const GROUND_STATES = new Set(['rollout', 'taxi-in', 'at-gate', 'boarding', 'pushback', 'taxi-out', 'lineup', 'takeoff']);

function makeFlight(route, kind) {
  const [icao, airline, city, type] = route;
  return {
    callsign: icao + String(1 + Math.floor(Math.random() * 8999)),
    airline, type, kind,
    origin: kind === 'ARR' ? city : hub,
    dest: kind === 'ARR' ? hub : city,
    city,
    state: null, gate: null,
    pos: { x: 0, y: 0 }, heading: 0, alt: 0, speed: 0,
    iaf: null, assigned: 0, cruise: 0,
    hist: [], histT: 0, trail: [], paint: null,
    gnd: null, sched: 0, goneAt: 0,
  };
}

function spawnArrival() {
  const f = makeFlight(rand(ROUTES[hub]), 'ARR');
  const brg = initialBearing(AIRPORTS[hub], AIRPORTS[f.city]) + jitter(10);
  const d = 70 + Math.random() * 20;
  f.pos = pt(brg, d);
  // join the approach the sensible way round: straight-in if already lined
  // up, otherwise a base leg on its own side
  const appDir = (RWY_HDG + 180) % 360;
  const off = ((brg - appDir + 540) % 360) - 180;
  if (Math.abs(off) < 45) f.iaf = pt(appDir, FAF_DIST + 8);
  else {
    const basePt = pt(appDir + Math.sign(off) * 90, 10);
    f.iaf = { x: FAF.x + basePt.x, y: FAF.y + basePt.y };
  }
  f.heading = bearingTo(f.pos, f.iaf);
  f.speed = 280 + Math.random() * 40;
  f.alt = 14000 + Math.random() * 10000;
  f.state = 'descent';
  return f;
}

function freeGate() {
  const open = G.gates.filter((g) => !g.busy);
  return open.length ? rand(open) : null;
}

function spawnDeparture() {
  const gate = freeGate();
  if (!gate) return null;
  const f = makeFlight(rand(ROUTES[hub]), 'DEP');
  f.state = 'boarding';
  f.gate = gate.id;
  gate.busy = f;
  f.assigned = (initialBearing(AIRPORTS[hub], AIRPORTS[f.city]) + jitter(8) + 360) % 360;
  f.cruise = 14000 + Math.random() * 12000;
  f.gnd = { x: gate.x, y: G.gateY, hdg: 0, wps: [], spd: 0, timer: 300 + Math.random() * 400 };
  f.sched = Date.now() + ((f.gnd.timer + 150) / TIME_ACCEL) * 1000;
  return f;
}

function spawnTransit() {
  for (let tries = 0; tries < 14; tries++) {
    let o, d2;
    do { o = rand(CODES); } while (o === hub);
    do { d2 = rand(CODES); } while (d2 === hub || d2 === o);
    const bIn = initialBearing(AIRPORTS[hub], AIRPORTS[o]);
    const bOut = initialBearing(AIRPORTS[hub], AIRPORTS[d2]);
    if (angDiff(bIn, bOut) < 80) continue;
    const f = makeFlight([rand(TRANSIT_AIRLINES), '', d2, rand(['B77W', 'A359', 'B789', 'A388', 'A333'])], 'TRN');
    f.origin = o;
    f.dest = d2;
    f.pos = pt(bIn + jitter(8), 88);
    f.exit = pt(bOut + jitter(8), 96);
    f.heading = bearingTo(f.pos, f.exit);
    f.speed = 400 + Math.random() * 80;
    f.alt = 29000 + Math.random() * 11000;
    f.state = 'cruise';
    return f;
  }
  return spawnArrival();
}

function topUpTraffic() {
  const live = flights.filter((f) => !f.goneAt);
  const arrAir = live.filter((f) => f.kind === 'ARR' && AIR_STATES.has(f.state)).length;
  const deps = live.filter((f) => f.kind === 'DEP').length;
  const trns = live.filter((f) => f.kind === 'TRN').length;
  if (arrAir < 5 && Math.random() < 0.6) flights.push(spawnArrival());
  else if (deps < 5) {
    const f = spawnDeparture();
    if (f) flights.push(f);
  } else if (trns < 3) flights.push(spawnTransit());
}

function seedTraffic() {
  flights = [];
  for (const g of G.gates) g.busy = null;
  selected = null;
  for (let i = 0; i < 4; i++) flights.push(spawnArrival());
  for (let i = 0; i < 4; i++) {
    const f = spawnDeparture();
    if (f) { f.gnd.timer *= Math.random(); flights.push(f); }
  }
  flights.push(spawnTransit());
  for (const f of flights) {
    if (f.state === 'descent') {
      const s = 0.35 + Math.random() * 0.6;
      f.pos.x *= s;
      f.pos.y *= s;
      f.alt *= 0.4 + s * 0.6;
    }
  }
}

// ---------- sequencing ----------

function distToGo(f) {
  if (f.state === 'descent') return dist(f.pos, f.iaf) + dist(f.iaf, FAF) + FAF_DIST;
  if (f.state === 'base') return dist(f.pos, FAF) + FAF_DIST;
  return dist(f.pos, ORIGIN);
}

// keep arrivals strung out along the approach instead of bunching up
function sequenceArrivals() {
  const arrs = flights.filter((f) => f.kind === 'ARR' && AIR_STATES.has(f.state) && !f.goneAt);
  for (const f of arrs) { f.dtg = distToGo(f); f.spdCap = 999; }
  arrs.sort((p, q) => p.dtg - q.dtg);
  for (let i = 1; i < arrs.length; i++) {
    if (arrs[i].dtg - arrs[i - 1].dtg < 6) {
      arrs[i].spdCap = Math.max(150, arrs[i - 1].speed - 25);
    }
  }
}

// ---------- air movement ----------

function stepAir(f, dt) {
  const turn = 3 * dt;

  f.histT += dt;
  if (f.histT > 4) {
    f.histT = 0;
    f.hist.unshift({ x: f.pos.x, y: f.pos.y });
    if (f.hist.length > 26) f.hist.pop();
  }

  if (f.kind === 'ARR') {
    const dField = dist(f.pos, ORIGIN);
    const targetSpd = Math.min(
      f.spdCap || 999,
      f.state === 'descent' ? 250 : f.state === 'base' ? 190 : 145
    );
    if (f.speed > targetSpd) f.speed = Math.max(targetSpd, f.speed - 8 * dt);
    else if (f.speed < targetSpd - 5) f.speed += 3 * dt;

    if (f.state === 'descent') {
      f.heading = lerpAngle(f.heading, bearingTo(f.pos, f.iaf), turn);
      const targetAlt = Math.max(7000, dist(f.pos, f.iaf) * 260 + 7000);
      if (f.alt > targetAlt) f.alt = Math.max(targetAlt, f.alt - 38 * dt);
      if (dist(f.pos, f.iaf) < 2) f.state = 'base';
    } else if (f.state === 'base') {
      f.heading = lerpAngle(f.heading, bearingTo(f.pos, FAF), turn);
      if (f.alt > 4000) f.alt = Math.max(4000, f.alt - 30 * dt);
      if (dist(f.pos, FAF) < 1.5) f.state = 'final';
    } else {
      f.heading = lerpAngle(f.heading, bearingTo(f.pos, ORIGIN), turn * 2);
      f.alt = Math.max(0, dField * 310);
      if (dField < 0.6) return land(f);
    }
  } else if (f.kind === 'DEP') {
    if (f.speed < 300) f.speed += 8 * dt;
    if (f.alt < f.cruise) f.alt = Math.min(f.cruise, f.alt + 45 * dt);
    const dField = dist(f.pos, ORIGIN);
    if (dField > 4) f.heading = lerpAngle(f.heading, f.assigned, turn);
    if (dField > 95) retire(f, 'departed');
  } else {
    f.heading = lerpAngle(f.heading, bearingTo(f.pos, f.exit), turn * 0.5);
    if (dist(f.pos, ORIGIN) > 95) retire(f, 'departed');
  }

  const nmps = f.speed / 3600;
  f.pos.x += Math.sin(rad(f.heading)) * nmps * dt;
  f.pos.y += Math.cos(rad(f.heading)) * nmps * dt;
}

function retire(f, state) {
  f.state = state;
  f.goneAt = performance.now() + 6000;
  if (selected === f) selected = null;
}

// touchdown: hand the flight from the scope to the ground radar
function land(f) {
  f.state = 'rollout';
  const gate = freeGate();
  f.gate = gate ? gate.id : null;
  if (gate) gate.busy = f;
  const gx = gate ? gate.x : 50;
  const exit = rand(G.exits);
  f.gnd = {
    x: G.rwyX0 + 1, y: G.rwyY, hdg: 90, spd: 1.75,
    wps: [
      { x: exit, y: G.rwyY, spd: 0.3 },
      { x: exit, y: G.twyY, spd: 0.25 },
      { x: gx, y: G.twyY, spd: 0.25 },
      { x: gx, y: G.gateY, spd: 0.12 },
    ],
    timer: 0,
  };
}

// ---------- ground movement ----------

function stepGround(f, dt) {
  const g = f.gnd;

  if (f.state === 'boarding') {
    g.timer -= dt;
    if (g.timer <= 0) {
      f.state = 'pushback';
      g.wps = [{ x: g.x, y: G.twyY - 2.5, spd: 0.06 }];
      g.spd = 0.06;
    }
    return;
  }
  if (f.state === 'lineup') {
    g.timer -= dt;
    if (g.timer <= 0) {
      f.state = 'takeoff';
      g.wps = [{ x: G.rwyX1 - 2, y: G.rwyY, spd: 2.1 }];
    }
    return;
  }
  if (f.state === 'at-gate') {
    g.timer -= dt;
    if (g.timer <= 0) {
      const gate = G.gates.find((x) => x.id === f.gate);
      if (gate && gate.busy === f) gate.busy = null;
      retire(f, 'arrived');
    }
    return;
  }

  if (!g.wps.length) return;
  const wp = g.wps[0];
  const target = wp.spd || 0.25;
  if (f.state === 'takeoff') g.spd = Math.min(2.1, g.spd + 0.035 * dt);
  else if (g.spd > target) g.spd = Math.max(target, g.spd - 0.15 * dt);
  else g.spd = Math.min(target, g.spd + 0.05 * dt);

  const dx = wp.x - g.x, dy = wp.y - g.y;
  const d = Math.hypot(dx, dy);
  const step = g.spd * dt;
  if (d <= step) {
    g.x = wp.x;
    g.y = wp.y;
    g.wps.shift();
    if (!g.wps.length) {
      if (f.state === 'rollout' || f.state === 'taxi-in') {
        if (f.state === 'rollout') {
          // still on the runway heading for the exit — not yet at the gate
        }
        if (g.y === G.gateY) {
          f.state = 'at-gate';
          g.hdg = 0;
          g.timer = 200 + Math.random() * 250;
        }
      } else if (f.state === 'pushback') {
        f.state = 'taxi-out';
        g.wps = [
          { x: G.entry, y: G.twyY, spd: 0.25 },
          { x: G.entry - 4, y: G.rwyY, spd: 0.15 },
          { x: G.rwyX0 + 2, y: G.rwyY, spd: 0.12 },
        ];
      } else if (f.state === 'taxi-out') {
        f.state = 'lineup';
        g.hdg = 90;
        g.timer = 30 + Math.random() * 60;
      } else if (f.state === 'takeoff') {
        // rotate: hand the flight to the approach radar
        f.state = 'climb';
        f.pos = { x: 0, y: 0 };
        f.heading = RWY_HDG;
        f.alt = 700;
        f.speed = 170;
        f.hist = [];
        f.trail = [];
        f.paint = null;
      }
    }
  } else {
    g.x += (dx / d) * step;
    g.y += (dy / d) * step;
    if (f.state !== 'pushback') g.hdg = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  }

  // mark the state change from runway to taxiway
  if (f.state === 'rollout' && g.y < G.rwyY - 1) f.state = 'taxi-in';
}

// ---------- canvases ----------

const scopeCanvas = document.getElementById('scope');
const ctx = scopeCanvas.getContext('2d');
const scopeWrap = scopeCanvas.parentElement;
const groundCanvas = document.getElementById('groundc');
const gtx = groundCanvas.getContext('2d');

let W = 0, DPR = 1, cx = 0, cy = 0, scopeR = 0;
let GW = 0, GH = 0, gscale = 1, gox = 0, goy = 0;

const pxPerNm = () => scopeR / range;
const toScreen = (p) => ({ x: cx + p.x * pxPerNm(), y: cy - p.y * pxPerNm() });
const gToScreen = (x, y) => ({ x: gox + x * gscale, y: goy + y * gscale });

// a little airliner silhouette, nose up, rotated to heading
function drawPlaneIcon(g, x, y, hdgDeg, scale, fill) {
  g.save();
  g.translate(x, y);
  g.rotate(rad(hdgDeg));
  g.scale(scale, scale);
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(0, -7);
  g.bezierCurveTo(1, -6.2, 1.3, -4.6, 1.3, -3);
  g.lineTo(1.3, -1.4);
  g.lineTo(7.2, 1.8);
  g.lineTo(7.2, 3.1);
  g.lineTo(1.3, 1.6);
  g.lineTo(1.05, 4.6);
  g.lineTo(3, 6.3);
  g.lineTo(3, 7.3);
  g.lineTo(0, 6.3);
  g.lineTo(-3, 7.3);
  g.lineTo(-3, 6.3);
  g.lineTo(-1.05, 4.6);
  g.lineTo(-1.3, 1.6);
  g.lineTo(-7.2, 3.1);
  g.lineTo(-7.2, 1.8);
  g.lineTo(-1.3, -1.4);
  g.lineTo(-1.3, -3);
  g.bezierCurveTo(-1.3, -4.6, -1, -6.2, 0, -7);
  g.closePath();
  g.fill();
  g.restore();
}

// ---------- approach radar rendering ----------

let staticLayer = null;

function buildStatic() {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * DPR);
  c.height = Math.ceil(W * DPR);
  const g = c.getContext('2d');
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const px = pxPerNm();
  const sxy = (x, y) => ({ x: cx + x * px, y: cy - y * px });

  g.fillStyle = '#0b1210';
  g.beginPath();
  g.arc(cx, cy, scopeR, 0, Math.PI * 2);
  g.fill();

  g.save();
  g.beginPath();
  g.arc(cx, cy, scopeR, 0, Math.PI * 2);
  g.clip();
  g.font = '10px ui-monospace, Menlo, monospace';

  g.strokeStyle = 'rgba(57,224,122,0.28)';
  g.lineWidth = 1.5;
  g.beginPath();
  COAST.forEach(([x, y], i) => {
    const s = sxy(x, y);
    i ? g.lineTo(s.x, s.y) : g.moveTo(s.x, s.y);
  });
  g.stroke();

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

  g.strokeStyle = 'rgba(57,224,122,0.22)';
  g.fillStyle = 'rgba(57,224,122,0.5)';
  const step = range / 4;
  for (let i = 1; i <= 3; i++) {
    g.beginPath();
    g.arc(cx, cy, i * step * px, 0, Math.PI * 2);
    g.stroke();
    g.fillText(String(i * step), cx + 4, cy - i * step * px + 12);
  }

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

  g.strokeStyle = '#23282f';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, scopeR, 0, Math.PI * 2);
  g.stroke();

  staticLayer = c;
}

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

let sweep = 0;
let prevSweep = 0;

const bearingRad = (p) => (Math.atan2(p.x, p.y) + Math.PI * 2) % (Math.PI * 2);

function sweptOver(brg) {
  if (prevSweep <= sweep) return brg > prevSweep && brg <= sweep;
  return brg > prevSweep || brg <= sweep;
}

function drawSweep() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR, 0, Math.PI * 2);
  ctx.clip();
  if (view === 'live') ctx.globalAlpha = 0.45;
  if (ctx.createConicGradient) {
    const grad = ctx.createConicGradient(sweep - Math.PI / 2, cx, cy);
    grad.addColorStop(0, 'rgba(57,224,122,0)');
    grad.addColorStop(0.72, 'rgba(57,224,122,0)');
    grad.addColorStop(1, 'rgba(57,224,122,0.30)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - scopeR, cy - scopeR, scopeR * 2, scopeR * 2);
  } else {
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

function paintBrightness(brg) {
  const behind = (sweep - brg + Math.PI * 2) % (Math.PI * 2);
  return Math.pow(1 - behind / (Math.PI * 2), 1.6);
}

function drawAirTraffic() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, scopeR, 0, Math.PI * 2);
  ctx.clip();
  ctx.font = `${Math.max(10, scopeR * 0.026)}px ui-monospace, Menlo, monospace`;

  const live = view === 'live';
  for (const f of flights) {
    if (f.goneAt || !AIR_STATES.has(f.state)) continue;
    const brg = bearingRad(f.pos);
    if (sweptOver(brg)) {
      f.paint = { x: f.pos.x, y: f.pos.y, alt: f.alt, speed: f.speed };
      f.trail.unshift({ x: f.pos.x, y: f.pos.y });
      if (f.trail.length > 7) f.trail.pop();
      if (soundOn && f === selected) pip(1320, 0.05, 0.06);
    }
    const shown = live ? { x: f.pos.x, y: f.pos.y, alt: f.alt, speed: f.speed } : f.paint;
    if (!shown) continue;

    const b = live ? 0.95 : Math.max(0.18, paintBrightness(bearingRad(f.paint)));
    const s = toScreen(shown);
    const isSel = f === selected;

    if (showTrails) {
      if (live) {
        if (f.hist.length > 1) {
          ctx.lineWidth = 2;
          for (let i = 0; i < f.hist.length - 1; i++) {
            const p1 = i === 0 ? s : toScreen(f.hist[i]);
            const p2 = toScreen(f.hist[i + 1]);
            ctx.strokeStyle = `rgba(57,224,122,${0.45 * (1 - i / f.hist.length)})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      } else {
        f.trail.forEach((tp, i) => {
          if (i === 0) return;
          const ts = toScreen(tp);
          ctx.fillStyle = `rgba(57,224,122,${b * 0.5 * (1 - i / f.trail.length)})`;
          ctx.fillRect(ts.x - 1.5, ts.y - 1.5, 3, 3);
        });
      }
    }

    const color = isSel ? `rgba(255,184,77,${0.35 + 0.65 * b})` : `rgba(57,224,122,${0.3 + 0.7 * b})`;
    ctx.shadowColor = isSel ? '#ffb84d' : PHOS;
    ctx.shadowBlur = 10 * b;
    if (live) {
      const scale = Math.max(0.9, scopeR / 380) * (WIDEBODIES.has(f.type) ? 1.35 : 1);
      drawPlaneIcon(ctx, s.x, s.y, f.heading, scale, color);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
    }
    ctx.shadowBlur = 0;
    if (isSel) {
      ctx.strokeStyle = `rgba(255,184,77,${0.4 + 0.5 * b})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, live ? 15 : 11, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (showLabels || isSel) {
      const h = hash(f.callsign);
      const side = h % 2 ? 1 : -1;
      const fl = String(Math.round(shown.alt / 100)).padStart(3, '0');
      const arrow = f.kind === 'ARR' ? '↓' : f.kind === 'DEP' && shown.alt < f.cruise ? '↑' : ' ';
      const spd = String(Math.round(shown.speed / 10)).padStart(2, '0');
      const lx = s.x + side * 16;
      const ly = s.y - 10 - (h % 3) * 4;
      ctx.strokeStyle = `rgba(57,224,122,${0.35 * b})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x + side * 5, s.y - 4);
      ctx.lineTo(lx - side * 2, ly + 3);
      ctx.stroke();
      ctx.fillStyle = isSel ? `rgba(255,184,77,${0.4 + 0.6 * b})` : `rgba(57,224,122,${0.35 + 0.65 * b})`;
      ctx.textAlign = side > 0 ? 'left' : 'right';
      ctx.fillText(f.callsign, lx, ly);
      ctx.fillText(`${fl}${arrow} ${spd}`, lx, ly + Math.max(11, scopeR * 0.028));
      ctx.textAlign = 'left';
    }
  }
  ctx.restore();
}

// ---------- ground radar rendering ----------

function drawGround() {
  gtx.clearRect(0, 0, GW, GH);
  gtx.fillStyle = '#10141a';
  gtx.fillRect(0, 0, GW, GH);

  const u = (n) => n * gscale;

  // apron + terminal
  gtx.fillStyle = '#1d2229';
  const ap0 = gToScreen(24, G.gateY - 3);
  gtx.fillRect(ap0.x, ap0.y, u(52), u(G.twyY - G.gateY + 6));
  gtx.fillStyle = '#2b313a';
  const t0 = gToScreen(26, 18);
  gtx.fillRect(t0.x, t0.y, u(48), u(8));

  // taxiways
  gtx.strokeStyle = '#3a414c';
  gtx.lineWidth = u(2.4);
  gtx.lineCap = 'round';
  const tw0 = gToScreen(G.entry - 4, G.twyY);
  const tw1 = gToScreen(84, G.twyY);
  gtx.beginPath();
  gtx.moveTo(tw0.x, tw0.y);
  gtx.lineTo(tw1.x, tw1.y);
  gtx.stroke();
  for (const x of [...G.exits, G.entry]) {
    const a = gToScreen(x, G.twyY);
    const b = gToScreen(x === G.entry ? x - 4 : x, G.rwyY);
    gtx.beginPath();
    gtx.moveTo(a.x, a.y);
    gtx.lineTo(b.x, b.y);
    gtx.stroke();
  }
  for (const gate of G.gates) {
    const a = gToScreen(gate.x, G.twyY);
    const b = gToScreen(gate.x, G.gateY);
    gtx.strokeStyle = '#333a44';
    gtx.lineWidth = u(1.4);
    gtx.beginPath();
    gtx.moveTo(a.x, a.y);
    gtx.lineTo(b.x, b.y);
    gtx.stroke();
  }

  // runway
  const r0 = gToScreen(G.rwyX0, G.rwyY);
  const r1 = gToScreen(G.rwyX1, G.rwyY);
  gtx.strokeStyle = '#454c57';
  gtx.lineWidth = u(3.6);
  gtx.beginPath();
  gtx.moveTo(r0.x, r0.y);
  gtx.lineTo(r1.x, r1.y);
  gtx.stroke();
  gtx.strokeStyle = 'rgba(236,231,217,0.5)';
  gtx.lineWidth = Math.max(1, u(0.24));
  gtx.setLineDash([u(2.2), u(1.8)]);
  gtx.beginPath();
  gtx.moveTo(r0.x + u(3), r0.y);
  gtx.lineTo(r1.x - u(3), r1.y);
  gtx.stroke();
  gtx.setLineDash([]);

  // labels
  gtx.fillStyle = 'rgba(236,231,217,0.75)';
  gtx.font = `${Math.max(9, u(1.7))}px ui-monospace, Menlo, monospace`;
  gtx.fillText(`RWY ${rwyLabel()}`, r0.x, r0.y - u(3));
  for (const gate of G.gates) {
    const s = gToScreen(gate.x, G.gateY - 1.6);
    gtx.textAlign = 'center';
    gtx.fillStyle = gate.busy ? 'rgba(255,184,77,0.8)' : 'rgba(111,118,128,0.9)';
    gtx.fillText(gate.id, s.x, s.y);
  }
  gtx.textAlign = 'left';

  // aircraft
  gtx.font = `${Math.max(9, u(1.6))}px ui-monospace, Menlo, monospace`;
  for (const f of flights) {
    if (f.goneAt || !GROUND_STATES.has(f.state) || !f.gnd) continue;
    const s = gToScreen(f.gnd.x, f.gnd.y);
    const isSel = f === selected;
    const color = isSel ? '#ffb84d' : '#39e07a';
    drawPlaneIcon(gtx, s.x, s.y, f.gnd.hdg, u(0.32) * (WIDEBODIES.has(f.type) ? 1.35 : 1), color);
    if (isSel || showLabels) {
      gtx.fillStyle = isSel ? 'rgba(255,184,77,0.9)' : 'rgba(57,224,122,0.7)';
      gtx.fillText(f.callsign, s.x + u(2.6), s.y - u(1.2));
    }
    if (isSel) {
      gtx.strokeStyle = 'rgba(255,184,77,0.8)';
      gtx.beginPath();
      gtx.arc(s.x, s.y, u(3), 0, Math.PI * 2);
      gtx.stroke();
    }
  }
}

// ---------- frame loop ----------

let last = 0;

function frame(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;
  const simDt = dt * TIME_ACCEL;

  prevSweep = sweep;
  sweep = (sweep + (dt * Math.PI * 2) / SWEEP_PERIOD) % (Math.PI * 2);
  if (soundOn && prevSweep > sweep && tab === 'app') pip(660, 0.5, 0.05);

  sequenceArrivals();
  for (const f of flights) {
    if (f.goneAt) continue;
    if (AIR_STATES.has(f.state)) stepAir(f, simDt);
    else if (GROUND_STATES.has(f.state)) stepGround(f, simDt);
  }
  const now = performance.now();
  flights = flights.filter((f) => !f.goneAt || now < f.goneAt);

  if (tab === 'app') {
    ctx.clearRect(0, 0, W, W);
    ctx.drawImage(staticLayer, 0, 0, W, W);
    if (showWx) drawWeather(simDt);
    drawSweep();
    drawAirTraffic();
  } else if (tab === 'ground') {
    drawGround();
  }

  requestAnimationFrame(frame);
}

// ---------- sidebar (tower / ground / clearance / gates) ----------

const sidebar = document.getElementById('sidebar');

function chipFor(f) {
  switch (f.state) {
    case 'descent': return 'DESCENT';
    case 'base': return 'BASE LEG';
    case 'climb': return 'CLIMB';
    case 'cruise': return `CRUISE FL${String(Math.round(f.alt / 100)).padStart(3, '0')}`;
    case 'final': return `LANDING RWY ${rwyLabel()}`;
    case 'rollout': return 'ROLLOUT';
    case 'lineup': return `LINEUP RWY ${rwyLabel()}`;
    case 'takeoff': return 'TAKEOFF';
    case 'taxi-in': return `TAXI GATE ${f.gate || '—'}`;
    case 'taxi-out': return `TAXI RWY ${rwyLabel()}`;
    case 'pushback': return `PUSHBACK GATE ${f.gate || '—'}`;
    case 'at-gate': return `GATE ${f.gate || '—'}`;
    case 'boarding': return `GATE ${f.gate || '—'}`;
    default: return '';
  }
}

function card(f) {
  const h = hash(f.airline || f.callsign);
  const hue = h % 360;
  const sel = f === selected ? ' sel' : '';
  const tag = (f.callsign || '').slice(0, 3);
  return `<div class="fcard${sel}" data-cs="${f.callsign}">
    <div class="alogo" style="background:hsl(${hue} 40% 24%);color:hsl(${hue} 80% 72%)" title="${f.airline}">${tag}</div>
    <div class="fmain"><span class="fcs">${f.callsign}</span><span class="ftype">${f.type}</span></div>
    <div class="fchips"><span class="chip act">${chipFor(f)}</span><span class="chip ok">ON TIME</span></div>
  </div>`;
}

function renderSidebar() {
  const fq = FREQS();
  const approaches = [];
  const towers = [];
  const grounds = [];
  const clearances = [];
  const gates = [];
  for (const f of flights) {
    if (f.goneAt) continue;
    if (f.state === 'descent' || f.state === 'base' || f.state === 'climb' || f.state === 'cruise') approaches.push(f);
    else if (f.state === 'final' || f.state === 'rollout' || f.state === 'lineup' || f.state === 'takeoff') towers.push(f);
    else if (f.state === 'taxi-in' || f.state === 'taxi-out') grounds.push(f);
    else if (f.state === 'pushback') clearances.push(f);
    else if (f.state === 'at-gate' || f.state === 'boarding') gates.push(f);
  }
  const section = (title, freq, list) =>
    `<div class="sect"><div class="sect-head">${title}${freq ? ` (${freq})` : ''}</div>${
      list.length ? list.map(card).join('') : '<div class="empty">—</div>'
    }</div>`;
  sidebar.innerHTML =
    section('APPROACH', fq.approach, approaches) +
    section('TOWER', fq.tower, towers) +
    section('GROUND', fq.ground, grounds) +
    section('CLEARANCE', fq.clearance, clearances) +
    section('GATES', '', gates);
}

sidebar.addEventListener('click', (e) => {
  const el = e.target.closest('.fcard');
  if (!el) return;
  const f = flights.find((x) => x.callsign === el.dataset.cs);
  selected = selected === f ? null : f;
  renderSidebar();
});

// ---------- timetable ----------

const ttArr = document.getElementById('tt-arr');
const ttDep = document.getElementById('tt-dep');

const fmtClock = (ms) => {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};

function ttStatus(f) {
  if (f.kind === 'ARR') {
    if (f.state === 'descent' || f.state === 'base') return ['SCHEDULED', 'ok'];
    if (f.state === 'final') return ['LANDING', 'act'];
    if (f.state === 'rollout' || f.state === 'taxi-in') return ['LANDED', 'ok'];
    return ['ARRIVED', 'ok'];
  }
  if (f.state === 'boarding') return ['BOARDING', 'ok'];
  if (f.state === 'pushback') return ['PUSHBACK', 'act'];
  if (f.state === 'taxi-out' || f.state === 'lineup') return ['TAXIING', 'act'];
  if (f.state === 'takeoff') return ['DEPARTING', 'act'];
  return ['DEPARTED', 'ok'];
}

function renderTimetable() {
  const now = Date.now();
  const rows = { ARR: [], DEP: [] };
  for (const f of flights) {
    if (f.kind === 'TRN') continue;
    let when;
    if (f.kind === 'ARR') {
      when = AIR_STATES.has(f.state)
        ? now + (distToGo(f) / Math.max(f.speed, 120)) * 3600000 / TIME_ACCEL
        : now;
    } else {
      when = f.sched;
    }
    rows[f.kind].push({ f, when });
  }
  for (const k of ['ARR', 'DEP']) rows[k].sort((a, b) => a.when - b.when);
  const render = (list) => list.map(({ f, when }) => {
    const [txt, cls] = ttStatus(f);
    const place = AIRPORTS[f.city] ? AIRPORTS[f.city].name : f.city;
    return `<div class="tt-row${f === selected ? ' sel' : ''}" data-cs="${f.callsign}">
      <div class="tt-time">${fmtClock(when)}</div>
      <div class="tt-mid">
        <span class="tt-cs">${f.callsign}</span><span class="tt-type">${f.type}</span>
        <div class="tt-place">${f.kind === 'ARR' ? 'FROM' : 'TO'}: ${place.toUpperCase()}</div>
        <div class="tt-airline">${f.airline}</div>
      </div>
      <span class="chip ${cls}">${txt}</span>
    </div>`;
  }).join('') || '<div class="empty">—</div>';
  ttArr.innerHTML = render(rows.ARR);
  ttDep.innerHTML = render(rows.DEP);
}

for (const el of [ttArr, ttDep]) {
  el.addEventListener('click', (e) => {
    const row = e.target.closest('.tt-row');
    if (!row) return;
    const f = flights.find((x) => x.callsign === row.dataset.cs);
    selected = selected === f ? null : f;
    renderTimetable();
  });
}

setInterval(() => {
  renderSidebar();
  if (tab === 'time') renderTimetable();
}, 1000);
setInterval(topUpTraffic, 4000);

// ---------- selection by click/tap on canvases ----------

const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

scopeCanvas.addEventListener('click', (e) => {
  const rect = scopeCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let best = null, bestD = coarsePointer ? 30 : 18;
  for (const f of flights) {
    if (f.goneAt || !AIR_STATES.has(f.state)) continue;
    const p = view === 'live' ? f.pos : f.paint;
    if (!p) continue;
    const s = toScreen(p);
    const d = Math.hypot(s.x - mx, s.y - my);
    if (d < bestD) { best = f; bestD = d; }
  }
  selected = best === selected ? null : best;
  renderSidebar();
});

groundCanvas.addEventListener('click', (e) => {
  const rect = groundCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let best = null, bestD = coarsePointer ? 30 : 18;
  for (const f of flights) {
    if (f.goneAt || !GROUND_STATES.has(f.state) || !f.gnd) continue;
    const s = gToScreen(f.gnd.x, f.gnd.y);
    const d = Math.hypot(s.x - mx, s.y - my);
    if (d < bestD) { best = f; bestD = d; }
  }
  selected = best === selected ? null : best;
  renderSidebar();
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

// ---------- tabs & controls ----------

const hubSel = document.getElementById('hub');
const rangeBtn = document.getElementById('range');
const viewBtn = document.getElementById('viewmode');
const labelsBtn = document.getElementById('labels');
const trailsBtn = document.getElementById('trails');
const wxBtn = document.getElementById('wx');
const soundBtn = document.getElementById('sound');

for (const code of Object.keys(ROUTES)) {
  const opt = document.createElement('option');
  opt.value = code;
  opt.textContent = `${code} · ${AIRPORTS[code].name}`;
  hubSel.appendChild(opt);
}

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + tab));
    document.body.className = 'tab-' + tab;
    if (tab === 'time') renderTimetable();
    resize();
  });
});

function syncURL() {
  try { history.replaceState(null, '', '?hub=' + hub); } catch (e) { /* file:// */ }
}

function setHub(code) {
  hub = code;
  RWY_HDG = AIRPORTS[hub].rwy % 360;
  FAF = pt((RWY_HDG + 180) % 360, FAF_DIST);
  hubSel.value = hub;
  seedTraffic();
  if (W) buildStatic();
  renderSidebar();
  renderTimetable();
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

viewBtn.addEventListener('click', () => {
  view = view === 'live' ? 'scope' : 'live';
  viewBtn.textContent = view;
  viewBtn.setAttribute('aria-pressed', String(view === 'live'));
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
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'r') rangeBtn.click();
  else if (e.key === 'v') viewBtn.click();
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

  // hidden panes report a zero rect — keep their last real geometry
  const sRect = scopeWrap.getBoundingClientRect();
  if (sRect.width > 50 && sRect.height > 50) {
    W = Math.min(sRect.width, sRect.height);
    scopeCanvas.width = Math.ceil(W * DPR);
    scopeCanvas.height = Math.ceil(W * DPR);
    scopeCanvas.style.width = W + 'px';
    scopeCanvas.style.height = W + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx = W / 2;
    cy = W / 2;
    scopeR = Math.max(1, W / 2 - 8);
    buildStatic();
  }

  const gRect = groundCanvas.parentElement.getBoundingClientRect();
  if (gRect.width > 50 && gRect.height > 50) {
    GW = gRect.width;
    GH = gRect.height;
    groundCanvas.width = Math.ceil(GW * DPR);
    groundCanvas.height = Math.ceil(GH * DPR);
    groundCanvas.style.width = GW + 'px';
    groundCanvas.style.height = GH + 'px';
    gtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    gscale = Math.min(GW / G.W, GH / G.H);
    gox = (GW - G.W * gscale) / 2;
    goy = (GH - G.H * gscale) / 2;
  }
}

const params = new URLSearchParams(location.search);
const startHub = params.get('hub');
setHub(startHub && ROUTES[startHub] ? startHub : 'KUL');

window.addEventListener('resize', resize);
resize();
renderSidebar();
renderTimetable();
requestAnimationFrame(frame);
