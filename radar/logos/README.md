# airline logos

PNG logos named by ICAO callsign prefix (`MAS.png`, `UAE.png`, `SIA.png`…),
shown in the sidebar and timetable. The app probes for `logos/{ICAO}.png`
at runtime and falls back to a brand-color word mark for any airline
without a file here.

The bundled set comes from the community-maintained
[sexym0nk3y/airline-logos](https://github.com/sexym0nk3y/airline-logos)
database (90×90 PNGs, ICAO-coded), which the ADS-B dashboard community
uses for the same purpose. `BTK.png` is the Malindo Air mark, the
airline's pre-rebrand identity, as Batik Air Malaysia isn't in the set.

All logos are trademarks of their respective airlines, used here to
identify the airline operating each flight. To add more airlines, drop
in a square-ish PNG named by ICAO code.
