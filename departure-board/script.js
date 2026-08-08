'use strict';

const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:./-!?'";

const FIELDS = [
  { label: 'TIME',        width: 5  },
  { label: 'DESTINATION', width: 12 },
  { label: 'FLIGHT',      width: 6  },
  { label: 'GATE',        width: 3  },
  { label: 'REMARKS',     width: 10 },
];
const ROWS = 8;
const ROW_WIDTH = FIELDS.reduce((s, f) => s + f.width, 0);

const DESTINATIONS = [
  'SINGAPORE', 'JOHOR BAHRU', 'BANGKOK', 'MUMBAI', 'CHICAGO', 'TOKYO',
  'ISTANBUL', 'REYKJAVIK', 'DOHA', 'ZURICH', 'NAIROBI', 'OSAKA',
  'TAIPEI', 'CAIRO', 'HONOLULU', 'THE MOON',
];
const AIRLINES = ['SQ', 'TR', 'MH', 'AK', 'TG', 'EK', 'QR', 'JL', 'NH', 'UA', 'BA', 'LH', 'GA', '6E'];
const REMARKS = ['ON TIME', 'ON TIME', 'ON TIME', 'BOARDING', 'BOARDING', 'GATE OPEN', 'DELAYED', 'FINAL CALL'];

const boardEl = document.getElementById('board');
const cells = [];      // cells[row][col] -> { el, current, target, timer }
let activeCells = 0;   // cells currently flapping (drives the clatter sound)

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
  let col = 0;
  for (const f of FIELDS) {
    for (let i = 0; i < f.width; i++) {
      const el = document.createElement('span');
      el.className = 'cell';
      if (i === 0 && f !== FIELDS[0]) el.classList.add('gap');
      el.textContent = ' ';
      rowEl.appendChild(el);
      row.push({ el, current: ' ', target: ' ', timer: null });
      col++;
    }
  }
  boardEl.appendChild(rowEl);
  cells.push(row);
}

// ---------- flap mechanics ----------

function stepCell(cell) {
  if (cell.current === cell.target) {
    cell.timer = null;
    activeCells--;
    return;
  }
  const i = CHARSET.indexOf(cell.current);
  cell.current = CHARSET[(i + 1) % CHARSET.length];
  cell.el.textContent = cell.current === ' ' ? ' ' : cell.current;
  cell.el.classList.remove('flip');
  void cell.el.offsetWidth; // restart the animation
  cell.el.classList.add('flip');
  cell.timer = setTimeout(() => stepCell(cell), 45 + Math.random() * 25);
}

function setCell(cell, ch, delay) {
  const target = CHARSET.includes(ch) ? ch : ' ';
  cell.target = target;
  if (cell.timer === null && cell.current !== target) {
    activeCells++;
    cell.timer = setTimeout(() => stepCell(cell), delay);
  }
}

function setRow(r, text) {
  const padded = text.padEnd(ROW_WIDTH).slice(0, ROW_WIDTH).toUpperCase();
  cells[r].forEach((cell, c) => setCell(cell, padded[c], c * 12 + Math.random() * 90));
}

// ---------- flights ----------

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtTime = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

let flights = [];

function newFlight(depMins) {
  return {
    dep: depMins,
    dest: rand(DESTINATIONS),
    flight: rand(AIRLINES) + String(100 + Math.floor(Math.random() * 900)),
    gate: 'ABCD'[Math.floor(Math.random() * 4)] + (1 + Math.floor(Math.random() * 29)),
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
    t += 8 + Math.floor(Math.random() * 22);
  }
}

function flightToText(f) {
  return fmtTime(f.dep).padEnd(FIELDS[0].width)
    + f.dest.padEnd(FIELDS[1].width).slice(0, FIELDS[1].width)
    + f.flight.padEnd(FIELDS[2].width)
    + f.gate.padEnd(FIELDS[3].width)
    + f.remark.padEnd(FIELDS[4].width).slice(0, FIELDS[4].width);
}

function renderFlights(staggerRows) {
  flights.forEach((f, r) => {
    setTimeout(() => setRow(r, flightToText(f)), staggerRows ? r * 130 : 0);
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
    flights[r] = newFlight(latest + 8 + Math.floor(Math.random() * 22));
  } else if (Math.random() < 0.06) {
    f.remark = 'CANCELLED';
  } else {
    f.remark = NEXT_REMARK[f.remark] || 'BOARDING';
  }
  setRow(r, flightToText(flights[r]));
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
  if (soundOn && audioCtx && activeCells > 0) playTick();
}, 35);

// ---------- controls ----------

const msgInput = document.getElementById('msg');
const soundBtn = document.getElementById('sound');

document.getElementById('send').addEventListener('click', () => {
  showMessage(msgInput.value);
  msgInput.value = '';
});
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    showMessage(msgInput.value);
    msgInput.value = '';
  }
});

document.getElementById('shuffle').addEventListener('click', () => {
  messageUntil = 0;
  generateFlights();
  renderFlights(true);
});

soundBtn.addEventListener('click', () => {
  ensureAudio();
  audioCtx.resume();
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? '\u{1F50A} sound' : '\u{1F507} sound';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
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
setInterval(tickFlights, 9000);
