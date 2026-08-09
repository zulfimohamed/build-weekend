'use strict';

const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:./-!?'";

const FIELDS = [
  { label: 'TIME',        width: 5  },
  { label: 'ORIGIN',      width: 12 },
  { label: 'DESTINATION', width: 12 },
  { label: 'FLIGHT',      width: 6  },
  { label: 'AIRLINE',     width: 13 },
  { label: 'GATE',        width: 3  },
  { label: 'CHECK-IN',    width: 5  },
  { label: 'REMARKS',     width: 10 },
];
// the boarding column isn't flaps — it's the row of lamps on the right
const BOARDING_WIDTH = 4;
const ROWS = 16;
const ROW_WIDTH = FIELDS.reduce((s, f) => s + f.width, 0);

// every city the board can be set to, with the hub carriers based there
const CITIES = {
  'SINGAPORE':    [['SQ', 'SINGAPORE AIR'], ['TR', 'SCOOT']],
  'KUALA LUMPUR': [['MH', 'MALAYSIA AIR'], ['AK', 'AIRASIA'], ['OD', 'BATIK AIR']],
  'BANGKOK':      [['TG', 'THAI AIRWAYS'], ['AK', 'AIRASIA']],
  'JAKARTA':      [['GA', 'GARUDA'], ['OD', 'BATIK AIR']],
  'TOKYO':        [['JL', 'JAPAN AIR'], ['NH', 'ANA'], ['MM', 'PEACH']],
  'OSAKA':        [['JL', 'JAPAN AIR'], ['NH', 'ANA'], ['MM', 'PEACH']],
  'SEOUL':        [['KE', 'KOREAN AIR'], ['OZ', 'ASIANA']],
  'TAIPEI':       [['BR', 'EVA AIR'], ['CI', 'CHINA AIR']],
  'HONG KONG':    [['CX', 'CATHAY PAC'], ['UO', 'HK EXPRESS']],
  'SHANGHAI':     [['MU', 'CHINA EASTERN'], ['FM', 'SHANGHAI AIR']],
  'MUMBAI':       [['AI', 'AIR INDIA'], ['6E', 'INDIGO']],
  'DELHI':        [['AI', 'AIR INDIA'], ['6E', 'INDIGO']],
  'DOHA':         [['QR', 'QATAR AIRWAYS']],
  'DUBAI':        [['EK', 'EMIRATES'], ['FZ', 'FLYDUBAI']],
  'ISTANBUL':     [['TK', 'TURKISH AIR'], ['PC', 'PEGASUS']],
  'LONDON':       [['BA', 'BRITISH AIR'], ['VS', 'VIRGIN ATL'], ['U2', 'EASYJET']],
  'PARIS':        [['AF', 'AIR FRANCE'], ['U2', 'EASYJET']],
  'AMSTERDAM':    [['KL', 'KLM'], ['HV', 'TRANSAVIA']],
  'FRANKFURT':    [['LH', 'LUFTHANSA']],
  'ZURICH':       [['LX', 'SWISS']],
  'ROME':         [['AZ', 'ITA AIRWAYS'], ['U2', 'EASYJET']],
  'MADRID':       [['IB', 'IBERIA'], ['UX', 'AIR EUROPA']],
  'NEW YORK':     [['DL', 'DELTA'], ['AA', 'AMERICAN'], ['UA', 'UNITED'], ['B6', 'JETBLUE']],
  'CHICAGO':      [['UA', 'UNITED'], ['AA', 'AMERICAN'], ['WN', 'SOUTHWEST']],
  'LOS ANGELES':  [['UA', 'UNITED'], ['AA', 'AMERICAN'], ['DL', 'DELTA'], ['AS', 'ALASKA']],
  'SEATTLE':      [['AS', 'ALASKA'], ['DL', 'DELTA']],
  'TORONTO':      [['AC', 'AIR CANADA'], ['WS', 'WESTJET']],
  'MEXICO CITY':  [['AM', 'AEROMEXICO'], ['Y4', 'VOLARIS']],
  'SYDNEY':       [['QF', 'QANTAS'], ['JQ', 'JETSTAR'], ['VA', 'VIRGIN AUS']],
  'MELBOURNE':    [['QF', 'QANTAS'], ['JQ', 'JETSTAR'], ['VA', 'VIRGIN AUS']],
  'AUCKLAND':     [['NZ', 'AIR NZ'], ['JQ', 'JETSTAR']],
  'NAIROBI':      [['KQ', 'KENYA AIRWAYS']],
  'CAIRO':        [['MS', 'EGYPTAIR']],
  // South African and FlySafair fly almost nothing from Cape Town that isn't
  // domestic or regional, so Cape Town's departures are the long-haul carriers
  // heading back to their own hubs — which is what the real board looks like
  'CAPE TOWN':    [],
  'REYKJAVIK':    [['FI', 'ICELANDAIR']],
  'HONOLULU':     [['HA', 'HAWAIIAN'], ['WN', 'SOUTHWEST']],
};

const DESTINATIONS = Object.keys(CITIES);

// where each carrier is based, and what it's called — both fall out of
// CITIES, so there's one place to edit a carrier
const BASES = {};
const NAMES = {};
for (const [name, carriers] of Object.entries(CITIES)) {
  for (const [code, airline] of carriers) {
    (BASES[code] = BASES[code] || []).push(name);
    NAMES[code] = airline;
  }
}

// The board cities each carrier actually flies to nonstop from its base.
// Pair this with the base list and a route is only legal when the operating
// carrier is at one end of it — which is how real schedules work, and what
// keeps Lufthansa off Singapore–Nairobi while leaving it on Singapore–Frankfurt.
const NETWORK = {
  // --- Southeast Asia ---
  SQ: ['KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA', 'SEOUL', 'TAIPEI',
       'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI', 'DUBAI', 'ISTANBUL', 'LONDON',
       'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'NEW YORK',
       'LOS ANGELES', 'SEATTLE', 'SYDNEY', 'MELBOURNE', 'AUCKLAND'],
  TR: ['KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA', 'SEOUL', 'TAIPEI',
       'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI'],
  MH: ['SINGAPORE', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA', 'SEOUL', 'TAIPEI',
       'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI', 'DOHA', 'DUBAI', 'LONDON',
       'SYDNEY', 'MELBOURNE'],
  AK: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TAIPEI', 'HONG KONG',
       'SHANGHAI', 'MUMBAI', 'DELHI', 'SEOUL', 'TOKYO', 'OSAKA', 'SYDNEY',
       'MELBOURNE'],
  OD: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'MUMBAI', 'DELHI',
       'HONG KONG', 'TAIPEI', 'SHANGHAI', 'MELBOURNE'],
  TG: ['SINGAPORE', 'KUALA LUMPUR', 'JAKARTA', 'TOKYO', 'OSAKA', 'SEOUL',
       'TAIPEI', 'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI', 'DUBAI', 'ISTANBUL',
       'LONDON', 'PARIS', 'FRANKFURT', 'ZURICH', 'ROME', 'SYDNEY', 'MELBOURNE'],
  GA: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'TOKYO', 'OSAKA', 'SEOUL',
       'HONG KONG', 'SHANGHAI', 'AMSTERDAM', 'SYDNEY', 'MELBOURNE'],

  // --- Northeast Asia ---
  JL: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'SEOUL', 'TAIPEI',
       'HONG KONG', 'SHANGHAI', 'DELHI', 'LONDON', 'PARIS', 'FRANKFURT',
       'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'SYDNEY', 'MELBOURNE',
       'HONOLULU', 'TOKYO', 'OSAKA'],
  NH: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'SEOUL', 'TAIPEI',
       'HONG KONG', 'SHANGHAI', 'DELHI', 'MUMBAI', 'LONDON', 'PARIS',
       'FRANKFURT', 'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'SYDNEY',
       'HONOLULU', 'TOKYO', 'OSAKA'],
  MM: ['SEOUL', 'TAIPEI', 'HONG KONG', 'SHANGHAI', 'BANGKOK', 'TOKYO', 'OSAKA'],
  KE: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'TAIPEI', 'HONG KONG', 'SHANGHAI', 'DELHI', 'DUBAI', 'ISTANBUL', 'LONDON',
       'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID', 'NEW YORK',
       'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO', 'SYDNEY', 'AUCKLAND',
       'HONOLULU'],
  OZ: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'TAIPEI', 'HONG KONG', 'SHANGHAI', 'DELHI', 'ISTANBUL', 'LONDON', 'PARIS',
       'FRANKFURT', 'ROME', 'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE',
       'SYDNEY', 'HONOLULU'],
  BR: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'SEOUL', 'HONG KONG', 'SHANGHAI', 'LONDON', 'PARIS', 'AMSTERDAM',
       'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO'],
  CI: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'SEOUL', 'HONG KONG', 'SHANGHAI', 'DELHI', 'LONDON', 'AMSTERDAM',
       'FRANKFURT', 'ROME', 'NEW YORK', 'LOS ANGELES', 'SEATTLE', 'SYDNEY',
       'MELBOURNE', 'AUCKLAND'],
  CX: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'SEOUL', 'TAIPEI', 'SHANGHAI', 'MUMBAI', 'DELHI', 'DUBAI', 'LONDON',
       'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID', 'NEW YORK',
       'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO', 'SYDNEY', 'MELBOURNE',
       'AUCKLAND'],
  UO: ['TOKYO', 'OSAKA', 'SEOUL', 'TAIPEI', 'BANGKOK', 'KUALA LUMPUR',
       'SINGAPORE', 'SHANGHAI'],
  MU: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'SEOUL', 'TAIPEI', 'HONG KONG', 'DELHI', 'DUBAI', 'ISTANBUL', 'LONDON',
       'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ROME', 'MADRID', 'NEW YORK',
       'CHICAGO', 'LOS ANGELES', 'SYDNEY', 'MELBOURNE', 'AUCKLAND'],
  FM: ['BANGKOK', 'TOKYO', 'OSAKA', 'SEOUL', 'TAIPEI', 'HONG KONG', 'SINGAPORE'],

  // --- South Asia ---
  AI: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'TOKYO', 'SEOUL', 'HONG KONG',
       'SHANGHAI', 'DOHA', 'DUBAI', 'LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT',
       'ZURICH', 'ROME', 'MADRID', 'NEW YORK', 'CHICAGO', 'LOS ANGELES',
       'TORONTO', 'SYDNEY', 'MELBOURNE', 'DELHI', 'MUMBAI'],
  '6E': ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'HONG KONG', 'DOHA', 'DUBAI',
         'ISTANBUL', 'AMSTERDAM', 'LONDON', 'DELHI', 'MUMBAI'],

  // --- Gulf & Turkey ---
  QR: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'SEOUL', 'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI', 'DUBAI', 'ISTANBUL',
       'LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID',
       'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO', 'SYDNEY',
       'MELBOURNE', 'AUCKLAND', 'NAIROBI', 'CAIRO', 'CAPE TOWN'],
  EK: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'SEOUL', 'TAIPEI', 'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI', 'DOHA',
       'ISTANBUL', 'LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME',
       'MADRID', 'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO',
       'MEXICO CITY', 'SYDNEY', 'MELBOURNE', 'AUCKLAND', 'NAIROBI', 'CAIRO',
       'CAPE TOWN'],
  FZ: ['DOHA', 'MUMBAI', 'DELHI', 'ISTANBUL', 'BANGKOK', 'CAIRO'],
  TK: ['SINGAPORE', 'KUALA LUMPUR', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA',
       'SEOUL', 'TAIPEI', 'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI', 'DOHA',
       'DUBAI', 'LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME',
       'MADRID', 'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO',
       'MEXICO CITY', 'NAIROBI', 'CAIRO', 'CAPE TOWN'],
  PC: ['LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID',
       'DUBAI', 'DOHA'],

  // --- Europe ---
  BA: ['SINGAPORE', 'BANGKOK', 'TOKYO', 'OSAKA', 'HONG KONG', 'SHANGHAI',
       'MUMBAI', 'DELHI', 'DOHA', 'DUBAI', 'ISTANBUL', 'PARIS', 'AMSTERDAM',
       'FRANKFURT', 'ZURICH', 'ROME', 'MADRID', 'NEW YORK', 'CHICAGO',
       'LOS ANGELES', 'SEATTLE', 'TORONTO', 'MEXICO CITY', 'NAIROBI', 'CAIRO',
       'CAPE TOWN'],
  VS: ['NEW YORK', 'LOS ANGELES', 'SEATTLE', 'MUMBAI', 'DELHI', 'SHANGHAI',
       'TOKYO', 'CAPE TOWN'],
  U2: ['LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID'],
  AF: ['SINGAPORE', 'BANGKOK', 'TOKYO', 'OSAKA', 'SEOUL', 'TAIPEI', 'HONG KONG',
       'SHANGHAI', 'MUMBAI', 'DELHI', 'DOHA', 'DUBAI', 'ISTANBUL', 'LONDON',
       'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID', 'NEW YORK',
       'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO', 'MEXICO CITY', 'NAIROBI',
       'CAIRO', 'CAPE TOWN'],
  KL: ['SINGAPORE', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA', 'SEOUL', 'TAIPEI',
       'HONG KONG', 'SHANGHAI', 'MUMBAI', 'DELHI', 'DOHA', 'DUBAI', 'ISTANBUL',
       'LONDON', 'PARIS', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID', 'NEW YORK',
       'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO', 'MEXICO CITY', 'NAIROBI',
       'CAIRO', 'CAPE TOWN'],
  HV: ['LONDON', 'PARIS', 'ROME', 'MADRID'],
  LH: ['SINGAPORE', 'BANGKOK', 'TOKYO', 'OSAKA', 'SEOUL', 'TAIPEI', 'HONG KONG',
       'SHANGHAI', 'MUMBAI', 'DELHI', 'DUBAI', 'ISTANBUL', 'LONDON', 'PARIS',
       'AMSTERDAM', 'ZURICH', 'ROME', 'MADRID', 'NEW YORK', 'CHICAGO',
       'LOS ANGELES', 'SEATTLE', 'TORONTO', 'MEXICO CITY', 'NAIROBI', 'CAIRO',
       'CAPE TOWN'],
  LX: ['SINGAPORE', 'BANGKOK', 'TOKYO', 'OSAKA', 'SHANGHAI', 'HONG KONG',
       'MUMBAI', 'DELHI', 'DUBAI', 'ISTANBUL', 'LONDON', 'PARIS', 'AMSTERDAM',
       'FRANKFURT', 'ROME', 'MADRID', 'NEW YORK', 'CHICAGO', 'LOS ANGELES',
       'TORONTO', 'CAIRO'],
  AZ: ['TOKYO', 'DELHI', 'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'TORONTO',
       'LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'MADRID', 'CAIRO'],
  IB: ['LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME',
       'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'TORONTO', 'MEXICO CITY', 'TOKYO',
       'CAIRO'],
  UX: ['NEW YORK', 'MEXICO CITY', 'ROME', 'PARIS', 'LONDON', 'AMSTERDAM',
       'FRANKFURT'],
  FI: ['LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID',
       'NEW YORK', 'CHICAGO', 'SEATTLE', 'TORONTO'],

  // --- North America ---
  DL: ['LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID',
       'TOKYO', 'SEOUL', 'SHANGHAI', 'MUMBAI', 'MEXICO CITY', 'TORONTO',
       'SYDNEY', 'AUCKLAND', 'HONOLULU', 'NEW YORK', 'CHICAGO', 'LOS ANGELES',
       'SEATTLE'],
  AA: ['LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID',
       'TOKYO', 'SEOUL', 'DELHI', 'DOHA', 'MEXICO CITY', 'TORONTO', 'SYDNEY',
       'AUCKLAND', 'HONOLULU', 'NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE'],
  UA: ['SINGAPORE', 'TOKYO', 'SEOUL', 'TAIPEI', 'HONG KONG', 'SHANGHAI', 'DELHI',
       'MUMBAI', 'DUBAI', 'ISTANBUL', 'LONDON', 'PARIS', 'AMSTERDAM',
       'FRANKFURT', 'ZURICH', 'ROME', 'MADRID', 'NEW YORK', 'CHICAGO',
       'LOS ANGELES', 'SEATTLE', 'TORONTO', 'MEXICO CITY', 'SYDNEY', 'MELBOURNE',
       'AUCKLAND', 'HONOLULU', 'CAPE TOWN'],
  B6: ['LONDON', 'PARIS', 'AMSTERDAM', 'LOS ANGELES', 'SEATTLE', 'CHICAGO',
       'NEW YORK'],
  WN: ['LOS ANGELES', 'SEATTLE', 'NEW YORK', 'MEXICO CITY', 'CHICAGO',
       'HONOLULU'],
  AS: ['NEW YORK', 'CHICAGO', 'TORONTO', 'MEXICO CITY', 'HONOLULU',
       'LOS ANGELES', 'SEATTLE'],
  AC: ['LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID',
       'TOKYO', 'SEOUL', 'HONG KONG', 'SHANGHAI', 'DELHI', 'MUMBAI', 'DUBAI',
       'DOHA', 'SYDNEY', 'MEXICO CITY', 'NEW YORK', 'CHICAGO', 'LOS ANGELES',
       'SEATTLE', 'TORONTO'],
  WS: ['LONDON', 'PARIS', 'ROME', 'MEXICO CITY', 'LOS ANGELES', 'SEATTLE',
       'NEW YORK', 'CHICAGO', 'TORONTO', 'HONOLULU'],
  AM: ['NEW YORK', 'CHICAGO', 'LOS ANGELES', 'SEATTLE', 'TORONTO', 'MADRID',
       'PARIS', 'AMSTERDAM', 'ROME', 'LONDON', 'TOKYO', 'SEOUL', 'MEXICO CITY'],
  Y4: ['LOS ANGELES', 'CHICAGO', 'NEW YORK', 'SEATTLE', 'MEXICO CITY'],
  HA: ['TOKYO', 'OSAKA', 'SEOUL', 'SYDNEY', 'AUCKLAND', 'LOS ANGELES', 'SEATTLE',
       'NEW YORK', 'HONOLULU'],

  // --- Oceania ---
  // Qantas reaches London the way it always has, one stop through Singapore —
  // see FIFTH_FREEDOM below, not a Sydney–London nonstop
  QF: ['SINGAPORE', 'BANGKOK', 'JAKARTA', 'TOKYO', 'OSAKA', 'SEOUL', 'HONG KONG',
       'DELHI', 'LOS ANGELES', 'AUCKLAND', 'HONOLULU', 'SYDNEY', 'MELBOURNE'],
  JQ: ['SINGAPORE', 'BANGKOK', 'TOKYO', 'OSAKA', 'AUCKLAND', 'SYDNEY',
       'MELBOURNE', 'HONOLULU'],
  VA: ['AUCKLAND', 'TOKYO', 'DOHA', 'SYDNEY', 'MELBOURNE'],
  NZ: ['SYDNEY', 'MELBOURNE', 'SINGAPORE', 'TOKYO', 'OSAKA', 'SEOUL',
       'HONG KONG', 'SHANGHAI', 'LOS ANGELES', 'NEW YORK', 'CHICAGO',
       'HONOLULU', 'AUCKLAND'],

  // --- Africa ---
  KQ: ['LONDON', 'PARIS', 'AMSTERDAM', 'DUBAI', 'DOHA', 'MUMBAI', 'BANGKOK',
       'CAPE TOWN', 'NAIROBI'],
  MS: ['LONDON', 'PARIS', 'AMSTERDAM', 'FRANKFURT', 'ZURICH', 'ROME', 'MADRID',
       'ISTANBUL', 'DUBAI', 'DOHA', 'MUMBAI', 'BANGKOK', 'TOKYO', 'NEW YORK',
       'TORONTO', 'NAIROBI', 'CAIRO'],
};

// Fifth-freedom services: a carrier flying between two cities that are both
// away from home. Rare in real life, so this stays a short explicit list
// rather than a rule.
const FIFTH_FREEDOM = [
  ['QF', 'SINGAPORE', 'LONDON'],      // QF1/2, the Kangaroo route
  ['SQ', 'FRANKFURT', 'NEW YORK'],    // SQ26/25
  ['EK', 'BANGKOK', 'HONG KONG'],     // EK384/385
  ['EK', 'SINGAPORE', 'MELBOURNE'],   // EK404/405
];

const serves = (code, city) => (NETWORK[code] || []).includes(city);
const basedAt = (code, city) => (BASES[code] || []).includes(city);

// every carrier that could plausibly be operating this city pair
function carriersFor(origin, dest) {
  const out = [];
  for (const code of Object.keys(NETWORK)) {
    if ((basedAt(code, origin) && serves(code, dest)) ||
        (basedAt(code, dest) && serves(code, origin)) ||
        FIFTH_FREEDOM.some(([c, a, b]) =>
          c === code && ((a === origin && b === dest) || (a === dest && b === origin)))) {
      out.push([code, NAMES[code]]);
    }
  }
  return out;
}

// the cities anyone actually flies to from here — recomputed only when the
// board changes city, since it walks every carrier
const destCache = {};
function destinationsFrom(origin) {
  if (!destCache[origin]) {
    destCache[origin] = DESTINATIONS.filter(
      (d) => d !== origin && carriersFor(origin, d).length > 0);
  }
  return destCache[origin];
}

const REMARKS = ['ON TIME', 'ON TIME', 'ON TIME', 'BOARDING', 'BOARDING', 'GATE OPEN', 'DELAYED', 'FINAL CALL'];

let city = localStorage.getItem('db-city');
if (!CITIES[city]) city = 'SINGAPORE';

const boardEl = document.getElementById('board');
const cells = [];      // cells[row][col] -> { el, current, target, nextAt, flipAlt }

// ---------- build the board ----------

const colheads = document.getElementById('colheads');
for (const f of FIELDS) {
  const span = document.createElement('span');
  span.textContent = f.label;
  span.style.flex = String(f.width);
  span.classList.add('f-' + f.label.toLowerCase());
  if (f !== FIELDS[0]) span.classList.add('gap');
  colheads.appendChild(span);
}
const boardingHead = document.createElement('span');
boardingHead.textContent = 'BOARDING';
boardingHead.style.flex = String(BOARDING_WIDTH);
boardingHead.classList.add('f-boarding', 'gap');
colheads.appendChild(boardingHead);

const lamps = []; // lamps[row] -> boarding indicator element

for (let r = 0; r < ROWS; r++) {
  const rowEl = document.createElement('div');
  rowEl.className = 'row';
  const row = [];
  for (const f of FIELDS) {
    for (let i = 0; i < f.width; i++) {
      const el = document.createElement('span');
      el.className = 'cell f-' + f.label.toLowerCase();
      if (i === 0 && f !== FIELDS[0]) el.classList.add('gap');
      el.textContent = ' ';
      rowEl.appendChild(el);
      row.push({ el, current: ' ', target: ' ', nextAt: 0, flipAlt: false });
    }
  }
  const lamp = document.createElement('span');
  lamp.className = 'lamp f-boarding gap';
  lamp.style.flex = String(BOARDING_WIDTH);
  rowEl.appendChild(lamp);
  lamps.push(lamp);
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
  const len = remark ? remark.length : 0;
  for (let c = REMARK_START; c < ROW_WIDTH; c++) {
    const el = cells[r][c].el;
    el.classList.remove(...STATUS_CLASSES);
    // only the cells the remark occupies, so the highlight doesn't span blanks
    if (cls && c - REMARK_START < len) el.classList.add(cls);
  }
  // the boarding lamp lights while the flight actually boards,
  // and blinks for the final call
  lamps[r].classList.toggle('lit', remark === 'BOARDING' || remark === 'FINAL CALL');
  lamps[r].classList.toggle('blink', remark === 'FINAL CALL');
}

// ---------- flights ----------

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtTime = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

// a check-in row assignment: a single desk row or a pair, like "04" or "10-11"
function randCheckin() {
  const row = 1 + Math.floor(Math.random() * 11);
  const pad = (n) => String(n).padStart(2, '0');
  return Math.random() < 0.5 ? pad(row) + '-' + pad(row + 1) : pad(row);
}

let flights = [];

function newFlight(depMins) {
  const origin = city;
  const dest = rand(destinationsFrom(origin));
  // everyone here is based at one end of the route already; the home
  // carriers just get the schedule share they'd have in real life
  const candidates = carriersFor(origin, dest);
  const home = candidates.filter(([code]) => basedAt(code, origin));
  const [code, airline] = rand(home.concat(home, candidates));
  return {
    dep: depMins,
    origin,
    dest,
    flight: code + String(100 + Math.floor(Math.random() * 900)),
    airline,
    gate: 'ABCDEF'[Math.floor(Math.random() * 6)] + (1 + Math.floor(Math.random() * 29)),
    checkin: randCheckin(),
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
  const cols = [fmtTime(f.dep), f.origin, f.dest, f.flight, f.airline, f.gate, f.checkin, f.remark];
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

function tickFlights() {
  const r = Math.floor(Math.random() * ROWS);
  const f = flights[r];
  let resort = false;
  if (f.remark === 'DEPARTED' || f.remark === 'CANCELLED') {
    const latest = Math.max(...flights.map((x) => x.dep));
    flights[r] = newFlight(latest + 4 + Math.floor(Math.random() * 14));
    resort = true;
  } else if (Math.random() < 0.06) {
    f.remark = 'CANCELLED';
  } else if (f.remark === 'ON TIME' && Math.random() < 0.18) {
    f.remark = 'DELAYED';
    f.dep += 15 + Math.floor(Math.random() * 35); // a delay actually moves the time
    resort = true;
  } else {
    f.remark = NEXT_REMARK[f.remark] || 'BOARDING';
  }
  // a delay that pushes a flight past the one below it drops it down the
  // board, and the rows below flap up — real boards re-sort the same way
  if (resort && flights.some((x, i) => i > 0 && x.dep < flights[i - 1].dep)) {
    flights.sort((a, b) => a.dep - b.dep);
    renderFlights(false);
    return;
  }
  setRow(r, flightToText(flights[r]));
  setRowStatus(r, flights[r].remark);
}

// ---------- add a random flight ----------

function addRandomFlight() {
  const first = nowMins() + 5;
  const latest = Math.max(...flights.map((f) => f.dep), first);
  const span = Math.max(latest - first, 1);
  const f = newFlight(first + Math.floor(Math.random() * span));
  let idx = flights.findIndex((x) => x.dep >= f.dep);
  if (idx === -1) idx = ROWS - 1;
  flights.splice(idx, 0, f);
  flights.length = ROWS; // the last flight drops off to make room
  for (let r = idx; r < ROWS; r++) {
    setTimeout(() => {
      setRow(r, flightToText(flights[r]));
      setRowStatus(r, flights[r].remark);
    }, (r - idx) * 60);
  }
}

// ---------- sound ----------

let audioCtx = null;
let noiseBuf = null;
let soundOn = false;

// A page whose only output is Web Audio lands in iOS's "ambient" audio
// session, which the ringer switch silences. Claiming "playback" — the
// category media players use — makes the board audible on silent. It also
// stops whatever else the phone was playing, so we only hold the claim
// while sound is actually on and hand it back the moment it goes off.
let silentEl = null;

// a tenth of a second of ±1-LSB tone: inaudible, but genuine non-zero
// output, which is what iOS wants before it opens a playback session.
// Built rather than pasted as a base64 blob so the file stays readable.
function silentClipURL() {
  const rate = 8000, n = 800;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const tag = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); tag(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, i % 2 ? 1 : -1, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function claimPlayback(on) {
  if (navigator.audioSession) navigator.audioSession.type = on ? 'playback' : 'auto';
  // older iOS has no audioSession — there, a media element in playback is
  // what moves the page out of the ambient category
  if (on) {
    if (!silentEl) {
      silentEl = new Audio(silentClipURL());
      silentEl.loop = true;
      silentEl.playsInline = true;
      silentEl.preload = 'auto';
    }
    const p = silentEl.play();
    if (p) p.catch(() => { /* no gesture yet, or not supported */ });
  } else if (silentEl) {
    silentEl.pause();
  }
}

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

const soundBtn = document.getElementById('sound');
const citySel = document.getElementById('city');
const themeSel = document.getElementById('theme');
const marksBtn = document.getElementById('marks');
const titleEl = document.getElementById('title');

document.getElementById('addflight').addEventListener('click', addRandomFlight);

document.getElementById('shuffle').addEventListener('click', () => {
  generateFlights();
  renderFlights(true);
});

// ---------- fullscreen ----------

// iPhone Safari exposes no Fullscreen API at all (only <video> can go
// fullscreen), and iPadOS still needs the webkit prefix. So the styling
// hangs off a `fs` class we control, and the native call — when there is
// one — is a bonus on top of it.
const fsBtn = document.getElementById('fullscreen');
const docEl = document.documentElement;
const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
const exitFs = document.exitFullscreen || document.webkitExitFullscreen;

const nativeFsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

// already launched from the home screen? then there's no chrome to hide
const standalone = navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches;
if (standalone) fsBtn.hidden = true;

// portrait phones are too narrow for all 66 flaps, so in fullscreen we turn
// the board on its side and use the long edge of the screen instead
const portrait = window.matchMedia('(orientation: portrait) and (max-width: 640px)');

function applyFullscreen(on) {
  document.body.classList.toggle('fs', on);
  document.body.classList.toggle('fs-rot', on && portrait.matches);
  fsBtn.setAttribute('aria-pressed', String(on));
}

portrait.addEventListener('change', () => {
  if (document.body.classList.contains('fs')) applyFullscreen(true);
});

// Esc, the iOS swipe, or the Android back button all leave fullscreen
// without going through the button — resync when they do
const onFsChange = () => { if (!nativeFsOn()) applyFullscreen(false); };
document.addEventListener('fullscreenchange', onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange);

fsBtn.addEventListener('click', () => {
  const on = !document.body.classList.contains('fs');
  applyFullscreen(on);
  if (on) {
    if (requestFs) Promise.resolve(requestFs.call(docEl)).catch(() => {});
    // Android honours this and saves us the CSS rotation; iOS rejects it
    if (screen.orientation && screen.orientation.lock) {
      Promise.resolve(screen.orientation.lock('landscape')).catch(() => {});
    }
  } else {
    if (exitFs && nativeFsOn()) Promise.resolve(exitFs.call(document)).catch(() => {});
    if (screen.orientation && screen.orientation.unlock) {
      try { screen.orientation.unlock(); } catch (e) { /* not supported */ }
    }
  }
});

soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  // claim the session before the context exists, so it opens in the right
  // category rather than having to be re-routed afterwards
  claimPlayback(soundOn);
  ensureAudio();
  audioCtx.resume().catch(() => { /* resumes on the next gesture */ });
  soundBtn.textContent = soundOn ? '\u{1F50A} sound' : '\u{1F507} sound';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
});

// ---------- city ----------

function updateTitle() {
  titleEl.textContent = 'DEPARTURES · ' + city;
}

for (const name of Object.keys(CITIES).sort()) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name.toLowerCase();
  citySel.appendChild(opt);
}
citySel.value = city;
updateTitle();

citySel.addEventListener('change', () => {
  city = citySel.value;
  localStorage.setItem('db-city', city);
  updateTitle();
  generateFlights();
  renderFlights(true);
});

// ---------- themes ----------

const THEMES = ['classic', 'phosphor', 'daylight', 'indigo'];
let theme = localStorage.getItem('db-theme');
if (!THEMES.includes(theme)) theme = 'classic';

function applyTheme() {
  for (const t of THEMES) document.body.classList.remove('theme-' + t);
  if (theme !== 'classic') document.body.classList.add('theme-' + theme);
}

for (const name of THEMES) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  themeSel.appendChild(opt);
}
themeSel.value = theme;
applyTheme();

themeSel.addEventListener('change', () => {
  theme = themeSel.value;
  localStorage.setItem('db-theme', theme);
  applyTheme();
});

// ---------- boarding marks (on by default) ----------

// the round lamps in the boarding column, lit while a flight boards —
// like the little green indicators on the real Changi board
let marksOn = localStorage.getItem('db-marks') !== 'off';

function applyMarks() {
  document.body.classList.toggle('marks', marksOn);
  marksBtn.setAttribute('aria-pressed', String(marksOn));
  marksBtn.textContent = (marksOn ? '◉' : '○') + ' marks';
}
applyMarks();

marksBtn.addEventListener('click', () => {
  marksOn = !marksOn;
  localStorage.setItem('db-marks', marksOn ? 'on' : 'off');
  applyMarks();
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
