# departure-board

A split-flap airport departure board, the kind that clatters. It invents a
schedule of sixteen flights — origin, destination, airline, gate, check-in
rows — drifts their remarks over time the way a real board does (boarding,
final call, departed, the occasional cancellation), and lets you clatter
new random flights into the schedule with a button press.

Turn the sound on for the full effect.

Pick a city — any of the three dozen the board knows, from Singapore to
Reykjavik — and the board becomes that airport's: every flight departs
from it and its hub carriers dominate the schedule. Routes follow the rule
real schedules follow: a carrier only appears on a row if it's based at one
end of it and actually serves the other. So Lufthansa boards for Frankfurt
but never for Nairobi, Southwest never boards for London, and a handful of
genuine fifth-freedom services — Qantas onward to London out of Singapore,
Emirates between Bangkok and Hong Kong — are listed as the exceptions they
are. The "+ add flight" button slots a new random flight into the schedule,
dropping the latest departure to make room.

Remarks are colour-coded like the real thing — green while boarding, a
pulsing accent for final call, red for cancellations — and a delayed flight
actually flaps its departure time back. Each flight gets a check-in row
assignment ("04" or "10-11"), and a boarding column of round lamp marks
(on by default) lights up green while a flight boards — steady for
boarding, blinking through the final call — just like Changi's board.

There are four themes (classic amber, green phosphor, daylight, indigo),
and your city, theme, and marks choices stick between visits.
On tablets and phones the board sheds its least essential columns (origin,
then airline, then gate) so the flaps stay readable, and there's a
fullscreen button for leaving it running as an ambient display. On a phone
held in portrait, fullscreen turns the board on its side so it gets the long
edge of the screen and every column comes back. iOS has no Fullscreen API,
so there the button expands the board within the page — add the board to
your home screen and it launches genuinely chrome-free.

## Run it

Open `index.html` in a browser. That's the whole deployment story.
