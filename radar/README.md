# radar

An ATC-game-style airport in the browser: approach radar, ground radar,
timetable, and a controller sidebar. Original art, no game assets — the
traffic is the realistic part.

- **Real routes** — pick a hub (KUL, SIN, DXB, LHR, JFK, HND) and every
  flight is a route the airline actually flies with plausible equipment:
  Malaysia Airlines A350 to London, Emirates A380 to JFK, AirAsia A320s
  around the region, flydubai 737s to Jeddah. ICAO callsigns (MAS, UAE,
  BAW…), airliners only. Arrivals come from where their city really is,
  departures leave on its true great-circle bearing.
- **Full lifecycle** — arrivals descend, join a base leg or straight-in,
  fly the ILS, land, roll out, taxi to a free gate. Departures board,
  push back, taxi to the holding point, line up, take off, and climb away
  on course. Sequencing keeps arrivals ~6 NM in trail.
- **APP RADAR** — a green phosphor scope with rotating sweep, range rings
  (20/40/80 NM), compass rose, data blocks, trails, and a weather toggle.
  Two display modes: `live` (plane silhouettes moving smoothly,
  flight-radar style) and `scope` (blips only update when the beam
  paints them).
- **AIRPORT RADAR** — a schematic ground view: runway, taxiways, gate
  piers, planes taxiing in and out, gate labels lighting up when occupied.
- **TIMETABLE** — arrivals and departures with times, status, airline,
  and city, updating as flights progress.
- **Sidebar** — flights grouped by who's working them: APPROACH, TOWER,
  GROUND, CLEARANCE, GATES, each with a frequency and status chips.
  Click a card, a blip, or a plane to select it anywhere.

- **Radio** — select any flight and the radio follows it through its
  phases with proper phraseology and radiotelephony callsigns
  ("Speedbird", "Red Cap", "Scooter"…): clearance, pushback, taxi,
  line-up, takeoff, approach, landing. With sound on, the calls are
  spoken over a squelch click.
- **Game speed** — x1 / x2 / x4 / x8, and a **timezone** picker for the
  clock and timetable: UTC, airport local time, or your own.

Built to fit any screen: the whole thing is an app shell that fills the
viewport and never scrolls as a page — the strip bay and timetable scroll
inside themselves. On phones the layout stacks, the radar sizes itself to
whatever room is left, the controls become one scrolling row, and the
airport ground map turns a quarter turn so the runway runs down the
screen. Landscape phones get the side-by-side layout with slimmer chrome.

Keyboard: `r` range · `v` view mode · `l` labels · `t` trails ·
`w` weather · `s` sound. The view is shareable: `?hub=SIN&spd=2&tz=hub`.

## Run it

Open `index.html` in a browser. Best enjoyed pretending your shift just
started.
