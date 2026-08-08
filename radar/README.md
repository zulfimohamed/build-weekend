# radar

An approach radar scope working imaginary traffic at a real hub airport.
Green phosphor, rotating sweep, and blips that only move when the beam
paints them — the way radar actually feels.

- **Real geography** — pick a radar site from 16 major hubs (KUL, SIN, DXB,
  LHR, JFK, HND, SYD…). Every flight enters and leaves the scope along the
  true great-circle bearing of the city it's coming from or going to,
  computed from real coordinates. A departure to London leaves to the
  northwest; an arrival from Sydney comes up from the southeast.
- **Traffic** — arrivals descend, join the final approach course, and land;
  departures roll off the runway, climb, and turn on course; overflights
  cross the scope at altitude. Airliners only, and the fleet fits the stage
  length: turboprops and regional jets on short hops, narrowbodies on
  medium haul, widebodies on long haul.
- **The scope** — range rings (RNG 20/40/80 NM), compass rose, video map,
  a restricted area you hope nobody clips, data blocks with callsign,
  flight level and ground speed, position-history trails, and a weather
  toggle for a few cells of precip.
- **Flight strips** — a strip bay beside the scope lists every aircraft
  with type, route, level and phase. Click a strip or a blip to select it.
- **Sound** — a low transmitter hum and a soft pip each rotation. Off by
  default; turn it on.

Works on phones and tablets too — the layout stacks, the tap targets grow.

Keyboard: `r` range · `l` labels · `t` trails · `w` weather · `s` sound.

The hub is shareable: `?hub=SIN`.

## Run it

Open `index.html` in a browser. Best enjoyed in a dark room, pretending
you're on shift.
