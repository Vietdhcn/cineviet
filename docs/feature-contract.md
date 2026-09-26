# CineViet MVP feature contract

## User job

Find a suitable demo film and showtime, reserve 1–8 seats safely, complete a simulated payment, and retrieve the resulting booking and tickets. Alternatively, request an explainable top-ten list for a selected cinema and date.

## Entry and exit points

- Entry: home catalogue, film detail, cinema/date showtime filter, recommendation page, or booking lookup.
- F01 success exit: confirmed booking with one QR ticket per seat.
- F02 success exit: ranked available films with reason labels and direct showtime actions.

## State contract

- Loading: stable skeletons and announced busy state.
- Empty: explain the missing catalogue, showtime, seats, booking history, or recommendations and offer a valid next action.
- Error: retain user context, explain recovery, and never imply a booking or payment succeeded.
- Disabled: explain why a seat, payment action, or recommendation query is unavailable.
- Success: update visible state and announce holds, cancellations, confirmations, and copied references.
- Interrupted: restore active booking state from the backend; expired holds cannot be confirmed.

## Ownership and public APIs

- `catalog`: published films, cinemas, showtimes, availability queries.
- `booking`: hold lifecycle, authoritative totals, cancellation, booking detail.
- `payment`: the current implementation records synchronous demo outcomes inside the booking module. The source plan's signed callback, pending reconciliation, and late-success refund workflow are still required for full P4 acceptance.
- `recommendation`: candidate filtering, profile/scoring, reason codes.
- `identity`: anonymous per-browser demo session; preferred genres are supplied per recommendation request.
- Features communicate through declared application contracts; presentation never accesses persistence directly.

## Acceptance criteria

- The repository builds from documented commands and starts with Docker Compose.
- Two concurrent holds cannot own the same seat; a partial conflicting request rolls back.
- Holds use server/DB time, expire after five minutes or at showtime, and cannot confirm afterward.
- Client-supplied prices are ignored; successful confirmation creates exactly one ticket per booking item.
- Recommendation ordering implements the documented cosine/popularity formula and deterministic tie-breaks.
- Both journeys provide loading, empty, error, disabled, success, and relevant interrupted states.
- Primary flows are usable at 390 px and 1440 px with keyboard and visible focus.

## Non-goals and invariants

No real payment, admin dashboard, voucher, concession, loyalty, rating, comment, email, or check-in capability. The source plan remains unchanged as reference. Synthetic data stays labeled and Beta affiliation is never implied.
