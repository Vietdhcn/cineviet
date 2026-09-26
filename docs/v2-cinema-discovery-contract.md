# V2 cinema discovery slice

## Scope

Customer-facing, read-only `/rap` and `/rap/:cinemaId`. This slice does not change payment, seat ownership, administration or backend data contracts. It works with both the browser demo and existing server read APIs.

## Behavior

- Directory reads the cinema list and today's future showtimes from `CinemaGateway`. Visitors can filter by exact city and a Vietnamese case-insensitive substring of cinema name/address/city; clearing restores the full list.
- Detail displays one cinema's supplied name/address, seven Vietnam-local dates, and future showtimes grouped by known movie. Each showtime links to the existing `/dat-ghe/:showtimeId` flow. Unknown cinema IDs show a recovery link.
- No location permission, map, distance claim, amenities, opening-hours claim or external provider is introduced. Cinema names, addresses, films and prices remain explicitly synthetic `DEMO` data.
- Browser-demo showtimes added/cancelled through `/dieu-hanh` appear/disappear here because both pages read the same gateway. Server mode remains read-only.

## Failure and accessibility states

- Directory and schedule have loading, error/retry and empty results; query filters preserve input through reload.
- Date controls are native buttons with `aria-pressed`. Showtime links announce film, time, format, room and starting price. Search and city controls have visible labels; page and navigation are keyboard-accessible.
- Tests cover city/keyword filtering, grouping/time ordering and Vietnam-local date keys. Browser smoke covers directory filter → cinema → date → seat route and 390 px overflow.

## Remaining production work

This is a discovery interface, not a verified real cinema directory. Production requires authorized cinema metadata, active operating locations, accurate geo/address data, a publish workflow and the separate payment/security go-live gates.
