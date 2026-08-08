# departure-board

A split-flap airport departure board, the kind that clatters. It invents a
schedule of sixteen flights — origin, destination, airline, gate — drifts
their remarks over time the way a real board does (boarding, final call,
departed, the occasional cancellation), and lets you clatter new random
flights into the schedule with a button press.

Turn the sound on for the full effect.

Pick a country and the board becomes that country's: origins draw from its
cities and its national carriers dominate the schedule. Airlines are
route-aware — a flight only pairs a carrier with a destination its network
actually covers, so Southwest never boards for London. A cities dropdown
narrows the board to a handful of destinations (4 to 24, or all of them),
and the "+ add flight" button slots a new random flight into the schedule,
dropping the latest departure to make room.

Remarks are colour-coded like the real thing — green while boarding, a
pulsing accent for final call, red for cancellations — and a delayed flight
actually flaps its departure time back. Status marks (on by default) add
pattern-coded underlines to highlighted remarks — solid for boarding,
dashed for delayed, dotted for cancelled, thick for final call — so status
reads without relying on colour alone.

There are four themes (classic amber, green phosphor, daylight, indigo),
and your country, cities, theme, and marks choices stick between visits.
On tablets and phones the board sheds its least essential columns (origin,
then airline, then gate) so the flaps stay readable, and there's a
fullscreen button for leaving it running as an ambient display.

## Run it

Open `index.html` in a browser. That's the whole deployment story.
