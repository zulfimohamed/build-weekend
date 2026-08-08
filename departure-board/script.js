'use strict';

const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:./-!?'";

const FIELDS = [
  { label: 'TIME',        width: 5  },
  { label: 'ORIGIN',      width: 12 },
  { label: 'DESTINATION', width: 12 },
  { label: 'FLIGHT',      width: 6  },
  { label: 'AIRLINE',     width: 13 },
  { label: 'GATE',        width: 3  },
  { label: 'REMARKS',     width: 10 },
];
const ROWS = 16;
const ROW_WIDTH = FIELDS.reduce((s, f) => s + f.width, 0);

const DESTINATIONS = [
  'SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
  'SEOUL', 'TAIPEI', 'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI',
  'DOHA', 'DUBAI', 'ISTANBUL', 'LONDON', 'PARIS', 'AMSTERDAM',
  'FRANKFURT', 'ZURICH', 'ROME', 'MADRID', 'NEW YORK', 'CHICAGO',
  'LOS ANGELES', 'SEATTLE', 'TORONTO', 'MEXICO CITY', 'SYDNEY',
  'MELBOURNE', 'AUCKLAND', 'NAIROBI', 'CAIRO', 'CAPE TOWN',
  'REYKJAVIK', 'HONOLULU',
];

const GLOBAL_AIRLINES = [
  ['EK', 'EMIRATES'], ['QR', 'QATAR AIRWAYS'], ['LH', 'LUFTHANSA'],
  ['KL', 'KLM'], ['AF', 'AIR FRANCE'], ['CX', 'CATHAY PAC'],
  ['TG', 'THAI AIRWAYS'], ['GA', 'GARUDA'], ['KE', 'KOREAN AIR'],
  ['QF', 'QANTAS'],
];

const COUNTRIES = {
  'SINGAPORE': {
    origins: ['SINGAPORE'],
    airlines: [['SQ', 'SINGAPORE AIR'], ['TR', 'SCOOT']],
  },
  'MALAYSIA': {
    origins: ['KUALA LUMPUR', 'PENANG', 'JOHOR BAHRU', 'KUCHING', 'LANGKAWI'],
    airlines: [['MH', 'MALAYSIA AIR'], ['AK', 'AIRASIA'], ['OD', 'BATIK AIR']],
  },
  'JAPAN': {
    origins: ['TOKYO', 'OSAKA', 'NAGOYA', 'SAPPORO', 'FUKUOKA', 'OKINAWA'],
    airlines: [['JL', 'JAPAN AIR'], ['NH', 'ANA'], ['MM', 'PEACH']],
  },
  'INDIA': {
    origins: ['MUMBAI', 'DELHI', 'BANGALORE', 'CHENNAI', 'HYDERABAD', 'KOCHI'],
    airlines: [['AI', 'AIR INDIA'], ['6E', 'INDIGO'], ['UK', 'VISTARA']],
  },
  'UAE': {
    origins: ['DUBAI', 'ABU DHABI', 'SHARJAH'],
    airlines: [['EK', 'EMIRATES'], ['EY', 'ETIHAD'], ['FZ', 'FLYDUBAI']],
  },
  'TURKEY': {
    origins: ['ISTANBUL', 'ANKARA', 'IZMIR', 'ANTALYA'],
    airlines: [['TK', 'TURKISH AIR'], ['PC', 'PEGASUS']],
  },
  'UK': {
    origins: ['LONDON', 'MANCHESTER', 'EDINBURGH', 'GLASGOW', 'BIRMINGHAM'],
    airlines: [['BA', 'BRITISH AIR'], ['VS', 'VIRGIN ATL'], ['U2', 'EASYJET']],
  },
  'USA': {
    origins: ['NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'MIAMI', 'DALLAS'],
    airlines: [['UA', 'UNITED'], ['AA', 'AMERICAN'], ['DL', 'DELTA'], ['WN', 'SOUTHWEST']],
  },
};

const REMARKS = ['ON TIME', 'ON TIME', 'ON TIME', 'BOARDING', 'BOARDING', 'GATE OPEN', 'DELAYED', 'FINAL CALL'];

let country = localStorage.getItem('db-country');
if (!COUNTRIES[country]) country = 'SINGAPORE';

const boardEl = document.getElementById('board');
const cells = [];      // cells[row][col] -> { el, current, target, nextAt, flipAlt }

// ---------- build the board ----------

const colheads = document.getElementById('colheads');
for (const f of FIELDS) {
  const span = document.createElement('span');
  span.textContent = f.label;
  span.style.flex = String(f.width);
  if (f !== FIELDS[0]) span.classList.add('gap');
  colheads.appendChild(span);
}

for (let r = 0; r < ROWS; r++) {
  const rowEl = document.createElement('div');
  rowEl.className = 'row';
  const row = [];
  for (const f of FIELDS) {
    for (let i = 0; i < f.width; i++) {
      const el = document.createElement('span');
      el.className = 'cell';
      if (i === 0 && f !== FIELDS[0]) el.classList.add('gap');
      el.textContent = ' ';
      rowEl.appendChild(el);
      row.push({ el, current: ' ', target: ' ', nextAt: 0, flipAlt: false });
    }
  }
  boardEl.appendChild(rowEl);
  cells.push(row);
}

// ---------- flap mechanics ----------

// One rAF loop drives every cell — per-cell timers plus forced reflows
// don't survive a board this size (16 rows x 61 cells).
const active = new Set(); // cells mid-flap (drives the loop and the clatter)

function setCell(cell, ch, delay) {
  const target = CHARSET.includes(ch) ? ch : ' ';
  cell.target = target;
  if (cell.current !== target && !active.has(cell)) {
    cell.nextAt = performance.now() + delay;
    active.add(cell);
  }
}

function frame(now) {
  for (const cell of active) {
    if (now < cell.nextAt) continue;
    if (cell.current === cell.target) { active.delete(cell); continue; }
    const i = CHARSET.indexOf(cell.current);
    cell.current = CHARSET[(i + 1) % CHARSET.length];
    cell.el.textContent = cell.current;
    // alternating animation names restart the flip without a reflow
    cell.flipAlt = !cell.flipAlt;
    cell.el.classList.toggle('flip-a', cell.flipAlt);
    cell.el.classList.toggle('flip-b', !cell.flipAlt);
    if (cell.current === cell.target) active.delete(cell);
    else cell.nextAt = now + 45 + Math.random() * 25;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function setRow(r, text) {
  const padded = text.padEnd(ROW_WIDTH).slice(0, ROW_WIDTH).toUpperCase();
  cells[r].forEach((cell, c) => setCell(cell, padded[c], c * 8 + Math.random() * 90));
}

// remark cells get a status colour, like the real thing
const REMARK_START = ROW_WIDTH - FIELDS[FIELDS.length - 1].width;
const STATUS_CLASSES = ['st-boarding', 'st-final', 'st-cancelled', 'st-delayed', 'st-departed'];
const REMARK_CLASS = {
  'BOARDING': 'st-boarding',
  'GATE OPEN': 'st-boarding',
  'FINAL CALL': 'st-final',
  'CANCELLED': 'st-cancelled',
  'DELAYED': 'st-delayed',
  'DEPARTED': 'st-departed',
};

function setRowStatus(r, remark) {
  const cls = REMARK_CLASS[remark];
  for (let c = REMARK_START; c < ROW_WIDTH; c++) {
    const el = cells[r][c].el;
    el.classList.remove(...STATUS_CLASSES);
    if (cls) el.classList.add(cls);
  }
}

// ---------- flights ----------

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtTime = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

let flights = [];

function newFlight(depMins) {
  const c = COUNTRIES[country];
  const origin = rand(c.origins);
  let dest = rand(DESTINATIONS);
  while (dest === origin) dest = rand(DESTINATIONS);
  // national carriers fly twice as often as the global pool
  const [code, airline] = rand(c.airlines.concat(c.airlines, GLOBAL_AIRLINES));
  return {
    dep: depMins,
    origin,
    dest,
    flight: code + String(100 + Math.floor(Math.random() * 900)),
    airline,
    gate: 'ABCDEF'[Math.floor(Math.random() * 6)] + (1 + Math.floor(Math.random() * 29)),
    remark: rand(REMARKS),
  };
}

function nowMins() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function generateFlights() {
  flights = [];
  let t = nowMins() + 10 + Math.floor(Math.random() * 20);
  for (let r = 0; r < ROWS; r++) {
    flights.push(newFlight(t));
    t += 4 + Math.floor(Math.random() * 14);
  }
}

function flightToText(f) {
  const cols = [fmtTime(f.dep), f.origin, f.dest, f.flight, f.airline, f.gate, f.remark];
  return cols.map((v, i) => v.padEnd(FIELDS[i].width).slice(0, FIELDS[i].width)).join('');
}

function renderFlights(staggerRows) {
  flights.forEach((f, r) => {
    setTimeout(() => {
      setRow(r, flightToText(f));
      setRowStatus(r, f.remark);
    }, staggerRows ? r * 90 : 0);
  });
}

// remarks drift over time, like a real board
const NEXT_REMARK = {
  'ON TIME': 'BOARDING',
  'GATE OPEN': 'BOARDING',
  'DELAYED': 'BOARDING',
  'BOARDING': 'FINAL CALL',
  'FINAL CALL': 'DEPARTED',
};

let messageUntil = 0;

function tickFlights() {
  if (Date.now() < messageUntil) return;
  const r = Math.floor(Math.random() * ROWS);
  const f = flights[r];
  if (f.remark === 'DEPARTED' || f.remark === 'CANCELLED') {
    const latest = Math.max(...flights.map((x) => x.dep));
    flights[r] = newFlight(latest + 4 + Math.floor(Math.random() * 14));
  } else if (Math.random() < 0.06) {
    f.remark = 'CANCELLED';
  } else if (f.remark === 'ON TIME' && Math.random() < 0.18) {
    f.remark = 'DELAYED';
    f.dep += 15 + Math.floor(Math.random() * 35); // a delay actually moves the time
  } else {
    f.remark = NEXT_REMARK[f.remark] || 'BOARDING';
  }
  setRow(r, flightToText(flights[r]));
  setRowStatus(r, flights[r].remark);
}

// ---------- message mode ----------

function showMessage(text) {
  const clean = text.toUpperCase().split('').filter((c) => CHARSET.includes(c)).join('');
  if (!clean.trim()) return;

  const lines = [];
  let line = '';
  for (const word of clean.split(' ')) {
    if (!line.length) line = word;
    else if (line.length + 1 + word.length <= ROW_WIDTH) line += ' ' + word;
    else { lines.push(line); line = word; }
    if (lines.length === ROWS) break;
  }
  if (line && lines.length < ROWS) lines.push(line);

  const start = Math.floor((ROWS - lines.length) / 2);
  for (let r = 0; r < ROWS; r++) {
    const text = lines[r - start] || '';
    const pad = Math.floor((ROW_WIDTH - text.length) / 2);
    setRow(r, ' '.repeat(Math.max(pad, 0)) + text);
    setRowStatus(r, null);
  }

  messageUntil = Date.now() + 9000;
  setTimeout(() => {
    if (Date.now() >= messageUntil) renderFlights(true);
  }, 9200);
}

// ---------- sound ----------

let audioCtx = null;
let noiseBuf = null;
let soundOn = false;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const len = Math.floor(audioCtx.sampleRate * 0.04);
  noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
}

function playTick() {
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.5;
  const bp = audioCtx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200 + Math.random() * 900;
  bp.Q.value = 1.2;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
  src.connect(bp).connect(gain).connect(audioCtx.destination);
  src.start();
}

setInterval(() => {
  if (soundOn && audioCtx && active.size > 0) playTick();
}, 35);

// ---------- controls ----------

const msgInput = document.getElementById('msg');
const soundBtn = document.getElementById('sound');
const countrySel = document.getElementById('country');
const themeSel = document.getElementById('theme');
const titleEl = document.getElementById('title');

function sendMessage() {
  const text = msgInput.value;
  if (!text.trim()) return;
  showMessage(text);
  // make the message shareable: /?msg=... shows it on load
  const url = new URL(location.href);
  url.searchParams.set('msg', text);
  history.replaceState(null, '', url);
  msgInput.value = '';
}

document.getElementById('send').addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

document.getElementById('shuffle').addEventListener('click', () => {
  messageUntil = 0;
  generateFlights();
  renderFlights(true);
});

document.getElementById('fullscreen').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});

soundBtn.addEventListener('click', () => {
  ensureAudio();
  audioCtx.resume();
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? '\u{1F50A} sound' : '\u{1F507} sound';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
});

// ---------- country ----------

function updateTitle() {
  titleEl.textContent = 'DEPARTURES · ' + country;
}

for (const name of Object.keys(COUNTRIES)) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name.toLowerCase();
  countrySel.appendChild(opt);
}
countrySel.value = country;
updateTitle();

countrySel.addEventListener('change', () => {
  country = countrySel.value;
  localStorage.setItem('db-country', country);
  updateTitle();
  messageUntil = 0;
  generateFlights();
  renderFlights(true);
});

// ---------- themes ----------

const THEMES = ['classic', 'phosphor', 'daylight', 'indigo'];
let theme = localStorage.getItem('db-theme');
if (!THEMES.includes(theme)) theme = 'classic';

for (const name of THEMES) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  themeSel.appendChild(opt);
}
themeSel.value = theme;
document.body.className = theme === 'classic' ? '' : 'theme-' + theme;

themeSel.addEventListener('change', () => {
  theme = themeSel.value;
  localStorage.setItem('db-theme', theme);
  document.body.className = theme === 'classic' ? '' : 'theme-' + theme;
});

// ---------- clock ----------

const clockEl = document.getElementById('clock');
function updateClock() {
  const d = new Date();
  const sep = d.getSeconds() % 2 ? ' ' : ':';
  clockEl.textContent =
    String(d.getHours()).padStart(2, '0') + sep + String(d.getMinutes()).padStart(2, '0');
}
updateClock();
setInterval(updateClock, 1000);

// ---------- go ----------

generateFlights();
renderFlights(true);
setInterval(tickFlights, 5500);

const sharedMsg = new URLSearchParams(location.search).get('msg');
if (sharedMsg) setTimeout(() => showMessage(sharedMsg), 1400);
