# V2 vertical slice: demo showtime operations

This contract covers the first implementable slice of the wider [v2 HTML plan](../Ke_hoach_Codex_Website_dat_ve_Beta.html). It is not a production administration or payment system.

## User job and boundary

- A reviewer acting as a demo cinema manager can see upcoming showtimes, add a showtime in an existing room, and cancel a showtime that has no active or confirmed booking.
- Entry: `/dieu-hanh` in browser-only demo mode. Exit: the public catalogue reflects the change, or a clear validation/conflict message explains why it did not.
- `operations` owns schedule validation and the operations UI. The demo gateway owns local persistence. Customer booking and recommendation consume the same active demo schedule through their existing `CinemaGateway` API.
- Server mode must not expose the demo management link or accept a demo admin mutation. Real role-based admin APIs are a later phase and require server authentication, authorization and audit.

## States

- Loading: show progress while reading the schedule.
- Empty: explain that no showtimes are present and offer the creation form.
- Error: preserve form values, show the reason and allow retry.
- Success: announce the newly created/cancelled showtime and refresh the list.
- Disabled: prevent cancellation of booked, started or already cancelled showtimes, with an explanation.
- Interrupted: each read reloads from local storage; no in-memory-only state claims to be durable.

## Acceptance and non-regression

- A new showtime has a real future timestamp, an existing cinema/room/movie, a valid price and no overlap with another active showtime in the room, including 20 minutes for turnover.
- A showtime with HELD or CONFIRMED bookings cannot be cancelled. Existing booking snapshots and seat holds remain unchanged.
- Public catalogue, seat selection and recommendations use the updated active demo schedule. New data is explicitly DEMO and persists across browser reloads.
- The original F01 booking and F02 recommendation tests, keyboard navigation, 390 px layout and demo payment labels remain intact.
- No real payment, account privilege, production schedule or Beta content is introduced by this slice.
