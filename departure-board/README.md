# departure-board

A split-flap airport departure board, the kind that clatters. It invents a
schedule of sixteen flights — origin, destination, airline, gate — drifts
their remarks over time the way a real board does (boarding, final call,
departed, the occasional cancellation), and lets you type any message to
watch it clatter into place letter by letter.

Turn the sound on for the full effect.

Pick a country and the board becomes that country's: origins draw from its
cities and its national carriers dominate the schedule. Remarks are
colour-coded like the real thing — green while boarding, a pulsing accent
for final call, red for cancellations — and a delayed flight actually flaps
its departure time back. There are four themes (classic amber, green
phosphor, daylight, indigo), and your country and theme choices stick
between visits.

Messages you display are shareable: sending one puts it in the URL as
`?msg=...`, and opening that link plays it on load. There's a fullscreen
button for leaving it running as an ambient display.

## Run it

Open `index.html` in a browser. That's the whole deployment story.
