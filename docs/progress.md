# Implementation progress

## P1 revoke all customer sessions (2026-09-27; latest status)

- Added Flyway V4 `accounts.session_version` and `POST /api/auth/logout-all` in opt-in customer-auth mode. The account page now offers a confirmed “Đăng xuất mọi thiết bị” action and reports completion; the HTTP client discards its revoked CSRF token. Login/registration bind the session to the current DB version; `/api/auth/me` and booking ownership requests reject older versions. Demo mode remains unchanged.
- Test-first evidence: a Java test first showed an older session remained valid, the controller route test first returned 404, the HTTP-client test first failed because the action was absent, and the browser test first timed out on the missing button. All then passed after implementation.
- On an isolated local PostgreSQL 18.6 database, Flyway V1–V4 applied. `tests/integration/logout-all.mjs` passed with two sessions of one account revoked, another account unaffected and a new login accepted. The existing customer-auth API test also passed; no HELD bookings or seats remained after browser testing. Backend `mvn verify`: 22 Java tests; frontend 18 tests, lint and build passed. The account browser flow passed at 375/390 px and landscape, before and after login. The three legacy demo browser flows were not rerun in this change.
- This completes **on-demand all-session revocation only**. Email ownership verification, password recovery, persistent login abuse controls, automatic revocation on password change, staff RBAC/MFA, staging recovery and payments remain open. Customer auth remains OFF by default; this is not a public release.

Historical entries below describe the state when recorded; earlier “all-session revocation missing” statements are superseded by this section.

## P1 customer account UI and strict pre-payment mode (2026-09-26; latest status)

- In customer-auth mode, `/api/session` no longer creates anonymous demo accounts and `/api/bookings/{id}/demo-payment` is not mapped. The opt-in account can still hold/cancel seats; no simulated payment or ticket is issued through this mode. Legacy demo mode keeps its existing visual test journey.
- Added `GET /api/auth/me` to restore the signed-in account after a reload, rejecting anonymous and demo identities. Customer-mode booking errors now direct unsigned users to login instead of telling them to refresh a demo session.
- Added `/tai-khoan` for register/login/logout with server CSRF and HttpOnly session cookies, visible form labels, password-manager autocomplete, error/loading feedback and safe return navigation. The HTTP adapter probes customer mode before creating any demo session and uses the rotated CSRF after authentication. Checkout in customer mode states that payment is unavailable and lets the user release a hold; the banner does not claim payment is simulated in this mode.
- Test-first integration evidence: `tests/integration/customer-auth.mjs` failed on each missing boundary/profile behavior before implementation, then passed against local PostgreSQL; `tests/e2e/customer-auth.py` passed registration → hold → no demo payment → cancel → logout → login → return to seats. The page had no horizontal overflow at 375/390 px or 844 px landscape. Backend `mvn verify`: 20 Java tests; frontend lint, 17 tests and build passed; the three legacy demo browser smokes still passed.
- This is a working local pre-payment slice, **not** public-ready customer identity. Still missing: email ownership verification, password recovery, durable rate limiting/abuse response, all-session revocation and security review. `cineviet.customer-auth-enabled` remains `false` by default. Staff RBAC, server-side showtime/price management, staging recovery and payment remain separate gates.

Historical entries below describe the state when recorded; earlier "no customer UI" statements are superseded by this section.

## Local PostgreSQL verification before payment work (2026-09-26)

- Used an isolated local PostgreSQL 18.6 instance, not a production database. Flyway V1–V3 applied successfully from an empty database and remained current on restart. Seed verification found 12 movies, 3 cinemas, 336 seats, 5 initial showtimes and 280 initial showtime-seat records.
- Fixed three runtime defects exposed by actual startup/database execution: lazy request resolution for non-web CSV import, the Spring Boot Flyway starter dependency, and PostgreSQL JDBC binding of `Instant` values in booking holds and timestamped CSV imports. `mvn verify` now passes 20 Java tests and packages the JAR.
- Imported `data/movies.reference.csv` in dry-run and twice in apply mode: 12 existing rows each time, no duplicates. A synthetic DRAFT row with `fetchedAt`/`verifiedAt` imported twice (new, then existing) with both timestamps verified in PostgreSQL. No licensed/real movie content was introduced.
- Ran `tests/load/seat-contention.mjs` against the backend and database in four 50-session rounds. Every round produced exactly one HELD booking and 49 `SEAT_CONFLICT` responses; group conflicts left no partial booking. Cancellation cleanup and database ownership checks passed.
- Ran `tests/integration/customer-auth.mjs` with customer auth enabled only on the isolated localhost backend. CSRF rejection, registration, case-insensitive duplicate email, session/CSRF rotation, logout invalidation, wrong-password rejection and correct login passed. Customer auth remains OFF by default and is not ready for public use.
- Ran `tests/integration/booking-hold.mjs`: server-calculated price ignored client price, idempotent retry returned the same booking, mismatched key reuse conflicted, foreign account could not read the booking, and cancellation released the seat. Ran `tests/integration/hold-expiry.mjs`: the worker expired an aged hold and released its seat. Database postcondition: no HELD bookings/seats or orphan seat owners after the tests.
- No real payment endpoint, payment callback, settlement, ticket issuance or demo-label change was attempted in this verification. Outstanding pre-payment work: email verification/recovery/abuse protection, staff roles and audit, server-side cinema/showtime/price administration, backup/restore, sustained load and staging recovery. P0–P8 are still not fully accepted.

Historical entries below describe the state when recorded; statements that PostgreSQL was unavailable are superseded by this section.

## P0 rerun before payment work (2026-09-26)

- Re-ran the available baseline on this machine: backend offline `mvn verify` passed (18 Java tests, packaged JAR); frontend lint, 15 tests, production build, and all three browser smoke flows (booking/tickets, showtime operations, cinema discovery) passed.
- Strengthened `tests/load/seat-contention.mjs`: it now requires distinct session cookies, asserts `SEAT_CONFLICT` rather than any 409, checks the contested seat is held, treats failed cancellation as a test failure, confirms the seat is available after cleanup, and refuses remote targets without an explicit opt-in. `node --check` and the remote-target safety guard passed.
- P0 is **not complete**. This machine has no Docker/PostgreSQL/WSL installation and no listener on `127.0.0.1:5432`; Flyway V1–V3, CSV import repeatability, actual 50-session contention, database postconditions, and recovery cannot be verified here. No payment integration or demo-label removal was attempted.

## V2 P1 partial — customer account API, disabled by default (2026-09-26)

- Added backend endpoints for CSRF bootstrap, customer registration, login and logout. Passwords are stored as versioned PBKDF2-HMAC-SHA256 hashes with per-account random salt; login uses a generic credential error and session IDs/CSRF tokens rotate after authentication. Flyway V3 adds case-insensitive email uniqueness.
- `cineviet.customer-auth-enabled` defaults to `false`. Enable only against an isolated development/staging database while email verification, recovery, durable abuse controls, admin RBAC/MFA and security review remain absent. No customer UI or production payment is connected.
- Offline Maven `verify` passed: 18 Java tests, including password hash and account-session tests, and a packaged backend JAR. Frontend lint, 15 tests and production build also passed. This is code/unit-test evidence only. PostgreSQL migration and end-to-end account flow remain unverified because Docker/PostgreSQL are unavailable here.

## V2 P1 partial — synthetic catalogue and offline CSV import (2026-09-26)

- Expanded the authored DEMO catalogue from five to twelve unique films in `data/movies.reference.csv`, the browser demo adapter, and Flyway `V2__movie_import_metadata.sql`. The server demo scheduler now supplies future showtimes for the seven added films. No Beta titles or posters were copied.
- Added an offline Spring command for movie CSV dry-run (default) and explicit apply. It requires non-web mode with scheduled workers disabled, validates rows and duplicate keys before writes, reports new/existing counts, and upserts by `sourceKey` in one transaction. `BETA_REFERENCE` rows cannot be published by the importer or database check. This is not an HTTP admin endpoint.
- Verified `mvn -o verify` (exit 0; 13 Java tests), `npm.cmd run lint` (0), `npm.cmd test` (0; 15 frontend tests), `npm.cmd run build` (0), booking smoke (0), cinema smoke including a new film (0), and operations smoke after updating its cancellation target (0). Desktop 1440 px and mobile 390 px captures of the expanded catalogue showed no horizontal overflow; long titles were moved out of compact artwork and remain readable beside it. The UI detector returned no findings. The first operations run timed out because its old empty-day assertion no longer held after new showtimes were added; the test now checks disappearance of the specific cancelled showtime.
- PostgreSQL, Docker and `psql` are not installed here, so V2 migration, import apply, dry-run against a live database and idempotence on PostgreSQL are **not verified**. P1 identity, role-scoped management, audit and the 60-account contention fixture remain open.

## V2 cinema discovery (2026-09-24)

- Added read-only cinema directory `/rap` with city/keyword filters and cinema detail `/rap/:cinemaId` with seven-day showtime selection, film grouping and a direct seat-selection link. Both use the existing gateway, so browser-demo showtime edits are reflected without a new API.
- Added `docs/v2-cinema-discovery-contract.md`, pure discovery tests and a browser smoke test. The pages keep all cinema details labeled as synthetic demo data; they do not imply real locations, maps or ticket sales.
- Verified `npm.cmd run lint`, `npm.cmd test` (14 tests), `npm.cmd run build`, cinema discovery smoke (city/keyword → date → seat), original booking/ticket smoke, and expanded operations smoke (created/cancelled showtime appears/disappears on both catalogue and cinema detail). Desktop/mobile screenshots at 1440/390 px showed no horizontal overflow or browser error; keyboard focus revealed later date chips. The Impeccable detector returned no findings. Independent finish review found one mobile date-discoverability issue; a partial next chip and guidance resolved it, and the final review verdict was PASS.

## V2 start — demo showtime operations (2026-09-24)

- The v2 HTML plan supersedes the old two-feature scope as a **target**, not a claim of completion. Added `docs/v2-feature-contract.md` for the first bounded slice.
- Added browser-only `/dieu-hanh`: choose existing demo cinema/room/movie, create a future showtime with 20-minute room turnover validation, cancel only unbooked shows, and persist changes in local storage. Customer catalogue, seat pricing and recommendations use the same active demo schedule. Server mode shows no demo management navigation and does not accept these mutations.
- Verified frontend baseline and changed code with `npm.cmd run lint`, `npm.cmd test` (11 tests), `npm.cmd run build`, `npm.cmd run test:e2e` (original two-seat hold/payment/ticket smoke) and `npm.cmd run test:e2e:operations` (create → public schedule → conflict → cancel → hidden). Browser inspection at 390 px and 1440 px found no page errors or horizontal overflow. Impeccable detector found no changed-target findings; independent finish review passed after one batch of mobile/feedback/loading fixes.
- Java/Maven were not in PATH, but temporary portable JDK 21 and Maven tools from the previous work session were found and `mvn verify -o` passed (8 tests, including new MoMo canonical HMAC verification). Docker/PostgreSQL remain unavailable; no migration or contention claim is made. Production identity/RBAC, server-side management, real payment, check-in, refunds and reporting remain unimplemented.
- The owner selected MoMo + VietQR for future real sales. Added `docs/payment-momo-vietqr.md` and a pure backend MoMo HMAC signature verifier with tests; no live payment endpoint or credentials were introduced. VietQR automatic confirmation remains blocked until a receiving bank/PSP and verified transaction feed are selected.

## P0 — Repository and environment

- Added React 19.3 / TypeScript 6 / Vite 8 frontend, Spring Boot 4.1.1 / Java 21 backend, PostgreSQL 18.6 Compose topology, pinned images and npm lockfile.
- Local environment evidence: Node 24.19 available; Java, Maven and Docker were not initially present in PATH. JDK 21.0.12 and Maven 3.9.16 were downloaded as temporary portable build tools without changing system configuration.
- On 2026-09-24, `npm run build`, `npm run lint`, `npm test`, browser `npm run test:e2e`, and backend `mvn verify` completed with exit code 0. Maven used a workspace-local dependency cache because its external cache was intermittently inaccessible in the sandbox.

## P1 — Schema and seed

- Added Flyway baseline with constraints, partial unique active-hold index, composite showtime-seat key, demo catalogue, and generated seats. A scheduled backend job now replenishes fictional future showtimes for the coming week without touching booked seats.
- Added synthetic CSV and provenance record.
- Migration compiled into the packaged application; database migration itself is not executed because Docker/PostgreSQL are unavailable in this environment.

## P2 — UI and read flows

- Added catalogue, movie detail, cinema/date filtering, loading/empty/error states, 390 px and 1440 px responsive captures.
- Demo adapter makes the complete journey reviewable without claiming backend verification.

## P3/P4 — Hold, simulated payment and tickets

- Frontend journey covers 1–8 seats, one active hold, five-minute timer, failed/success simulated payment, booking history, and one actual QR image per issued ticket token.
- Backend transactions lock account/showtime/seats, calculate server totals, use idempotency keys, issue tickets atomically and expire holds on a five-second worker. Browser sessions are isolated with HttpOnly cookies and CSRF tokens.
- Java unit and CSRF-filter tests pass. A 50-session seat-contention/partial-rollback runner is present and syntax-checked, but PostgreSQL migration, runtime, concurrency and load tests remain unexecuted until Docker/PostgreSQL are available.

## P5 — Recommendations

- Implemented matching TypeScript and Java scorers with the A/C/B cosine fixture, average vectors from distinct confirmed films, available-seat filtering and deterministic tie-breaks.
- Frontend and Java A/C/B and history-blend scorer tests passed. Personalization quality on real users is not claimed.

## P6–P8 — Finish and handoff

- Original artwork, responsive UI, accessibility states, design-system record, Docker packaging, README and browser end-to-end smoke evidence are present.
- The source repository is public and the synthetic-data frontend is deployed on GitHub Pages; its build/deploy workflow and refreshable cinema route were checked. This is not a production backend deployment. Real data import and real-user recommendation evaluation are not claimed.

## Outstanding source-plan gates

- P1: migration/import repeatability passed on local PostgreSQL. Identity completion, RBAC, audit and the 60-account contention fixture remain open.
- P4: synchronous demo payment succeeds/fails and issues one QR token per seat, but signed HMAC callbacks, PENDING reconciliation, late-success `REFUND_REQUIRED`, and replay/amount validation are not implemented yet.
- P7: `tests/load/seat-contention.mjs` passed four local PostgreSQL rounds, and database postconditions passed. Docker Compose startup, staging load/recovery, backup/restore and later payment edge-case tests are still pending.
- P8: the local packaging and instructions exist, but final acceptance must follow the above database and payment gates; this document deliberately does not mark the HTML plan complete.
