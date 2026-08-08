# window-seat

A travel emulator. The view from a train or plane window, going nowhere in
particular, forever.

- **Train mode** — parallax landscape: mountains, hills, a treeline with the
  occasional house, telegraph poles whipping past with sagging wires.
- **Plane mode** — a porthole above the cloud deck, wing in view, wingtip
  light blinking, the destination's terrain drifting far below.
- **Routes** — pick an origin and a destination from real places
  (Kuala Lumpur, Tokyo, Zurich, Dubai, Reykjavik…). Choosing a destination
  switches the scenery to match where you're headed.
- **Scenery** — toggle between countryside, coast (sea, boats, palms, a
  lighthouse), desert (mesas, dunes, cacti), alps (snowy peaks, chalets,
  falling snow) and city (skylines with lit windows).
- **Aircraft** — in plane mode, choose your ride: Airbus A350 (sharklet
  wingtip), Boeing 747 (engine pods under a big wing) or ATR 72 (high wing
  with a spinning propeller). Each sounds different too.
- **Time of day** — cycle day / sunset / night. Night has stars, the odd
  shooting star, and lit windows in the houses.
- **Sound** — procedural Web Audio ambience: engine hum for the plane
  (turboprop drone on the ATR), rumble and clack-clack for the train.
  Off by default; turn it on.
- **Little touches** — flocks of birds by day, snowfall in the alps,
  city street grids glowing below the clouds at night.

Everything is drawn procedurally on a canvas — no images, no libraries.

## Run it

Open `index.html` in a browser. Best enjoyed fullscreen with the lights off
and nowhere to be.

Keyboard: `m` mode · `t` time of day · `n` scenery · `s` sound.

The URL always reflects the current view, so any view is shareable, e.g.
`?mode=plane&time=night&from=KUL&to=ZRH&aircraft=b747`.
