# CineViet

For the audited path from this demo to a real ticket-selling system, open [plan.html](plan.html). It separates implemented code, verified behavior, missing production gates, and decisions needed from the project owner.

CineViet currently runs as a local-first cinema-booking demo. Its original two customer workflows are:

- F01: choose a showtime and 1–8 seats, hold them for five minutes, complete a clearly simulated payment, and retrieve one ticket per seat.
- F02: receive up to ten explainable movie recommendations filtered to a cinema, date and available future showtimes.

The [v2 HTML plan](Ke_hoach_Codex_Website_dat_ve_Beta.html) expands the target to customers, cinema management, payment, admission and reports. The owner selected MoMo and VietQR for future real sales; the [payment integration contract](docs/payment-momo-vietqr.md) records the safety gates. Implemented v2 UI slices now include a **browser-only demo showtime editor** at `/dieu-hanh` and **cinema discovery** at `/rap` with a cinema-specific date/showtime page. MoMo signature preparation exists in the backend but no real provider call or ticket settlement is enabled. All bundled movies, cinemas, schedules and prices are fictional `DEMO` data. CineViet is not affiliated with Beta Cinemas and does not accept real payment details.

Customer registration/login/logout and on-demand “log out all devices” now have a server-mode UI at `/tai-khoan`, an authenticated profile endpoint, and PostgreSQL-backed booking ownership. Revocation increments a DB-backed session version, so existing sessions of that account lose access; it was checked with two local sessions. Customer auth is still **disabled by default** (`cineviet.customer-auth-enabled=false`) and may be enabled only on an isolated development/staging database: email verification, recovery, durable brute-force protection, staff permissions and MFA are not implemented. When enabled, anonymous demo sessions and demo payment routes are unavailable; a held seat can be cancelled or allowed to expire, but not paid for. See [plan.html](plan.html) for the current go-live gates.

## GitHub Pages showcase

The [Pages workflow](.github/workflows/pages.yml) checks lint and unit tests, then builds only `frontend/` with `VITE_API_MODE=demo` and the `/cineviet/` base path. Its hash routes (for example, `/#/rap`) survive refresh on a static host. To reproduce the build locally:

```powershell
cd frontend
npm ci
$env:VITE_API_MODE = 'demo'
npm run build -- --base /cineviet/
npm run preview -- --host 127.0.0.1 --base /cineviet/
```

This is a public **synthetic-data showcase**, not deployment of the Java API or PostgreSQL. Bookings, showtime edits, QR codes and payment outcomes in this build are browser-local simulations; no real ticket is issued or money collected. The server-mode account feature is not available on Pages. Do not enter real personal or payment information. Real sales and payment integration remain deferred until the gates in [plan.html](plan.html) are met.

## Quick visual demo

Requires Node.js 22.12+ (Node 24 is used by the Docker image).

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. This uses the browser-only demo adapter so the complete UI can be evaluated without Java or Docker.

Open `http://localhost:5173/dieu-hanh` to add or cancel a local demo showtime. The editor uses the same browser-local schedule as the public catalogue. It rejects room overlaps (including 20 minutes for turnover) and refuses to cancel a showtime with an active hold or confirmed booking. There is **no admin login or production authorization** in this mode; do not use it with real cinema data.

Open `http://localhost:5173/rap` to filter the fictional cinema directory by city or keyword, choose a cinema, browse seven days of showtimes and enter seat selection. This uses the same schedule source as `/dieu-hanh` in browser demo mode.

## Full stack with PostgreSQL

Requires Docker with Compose v2.

```powershell
Copy-Item infra/.env.example infra/.env
# Edit infra/.env and replace the local PostgreSQL password.
docker compose --env-file infra/.env -f infra/compose.yaml up --build
```

Open `http://localhost:8088`. The frontend image is built with `VITE_API_MODE=server`, so all catalogue, booking, payment and recommendation requests use Spring Boot and PostgreSQL.

For a local-only pre-payment account test, run the PostgreSQL-backed backend on port 8080 with `--cineviet.customer-auth-enabled=true`, then run Vite with `VITE_API_MODE=server`. The page `/tai-khoan` uses `/api/auth/csrf`, `/api/auth/me`, register/login/logout/logout-all and the same server-side booking API. Do **not** expose this configuration publicly: it lacks email verification, recovery and abuse controls. The demo-payment endpoint is disabled in this mode, and the checkout page offers only cancellation of a hold.

The authored [movie CSV](data/movies.reference.csv) contains twelve fictional DEMO films. After starting PostgreSQL and building the backend JAR, preview or apply its catalogue import from the repository root. The default is a dry run; only the second command writes. This is an offline command, with no public admin endpoint:

```powershell
java -jar backend/target/cineviet-backend-1.0.0.jar --spring.main.web-application-type=none --cineviet.scheduling.enabled=false --cineviet.catalog-import.path=data/movies.reference.csv
java -jar backend/target/cineviet-backend-1.0.0.jar --spring.main.web-application-type=none --cineviet.scheduling.enabled=false --cineviet.catalog-import.path=data/movies.reference.csv --cineviet.catalog-import.apply=true
```

Run against the intended demo database using the same `SPRING_DATASOURCE_*` settings as the backend. The importer validates the entire CSV before writing, uses `sourceKey` for idempotent upsert, and keeps `BETA_REFERENCE` rows as drafts. Both the browser demo and the V2 database seed include twelve fictional films; importing the CSV updates server-side catalogue metadata only.

Stop the stack without deleting data:

```powershell
docker compose --env-file infra/.env -f infra/compose.yaml down
```

## Verification

Frontend:

```powershell
cd frontend
npm ci
npm run lint
npm test
npm run build
# With the Vite server running at 127.0.0.1:5173 and Chrome installed:
npm run test:e2e
npm run test:e2e:operations
npm run test:e2e:cinemas
```

Backend (Java 21 and Maven 3.9.16+):

```powershell
cd backend
mvn verify
```

Health endpoint: `http://localhost:8088/actuator/health` through the reverse proxy, or port 8080 inside the Compose network.

Against an isolated running PostgreSQL-backed demo stack, test 50 distinct sessions racing for the same seat. The runner checks the conflict code, group rollback and seat release after cancelling the winner:

```powershell
node tests/load/seat-contention.mjs
```

The runner refuses remote hosts unless `CINEVIET_ALLOW_REMOTE_TEST=true` is explicitly set. On 2026-09-26 it passed four 50-session rounds against an isolated local PostgreSQL 18.6 database: one successful hold and 49 `SEAT_CONFLICT` responses per round, with group rollback and seat release checked. This is local integration evidence, not a staging/load certification.

Other local API integration checks live in `tests/integration/customer-auth.mjs`, `tests/integration/logout-all.mjs`, `tests/integration/booking-hold.mjs` and `tests/integration/hold-expiry.mjs`. Customer-auth and logout-all testing require an isolated backend started with `cineviet.customer-auth-enabled=true`; the expiry test additionally requires `CINEVIET_TEST_DB_EXPIRE=true` and local database access. These scripts are not production probes.

The account browser flow is covered by `tests/e2e/customer-auth.py` against a local Vite server in server mode and a local PostgreSQL-backed backend with customer auth enabled. It checks registration, profile restoration, hold/cancel without demo payment, logout, login, return navigation, logout-all and 375/390 px plus landscape width.

## Architecture

```text
frontend/src/
  domain/                 # stable cinema contracts and recommendation formula
  infrastructure/         # demo and HTTP gateway adapters
  features/               # catalog, cinema discovery, booking, recommendation and demo operations
  ui/                     # shared accessible primitives/compositions
backend/src/main/java/vn/cineviet/
  catalog/ booking/ recommendation/ shared/
backend/src/main/resources/db/migration/
infra/compose.yaml
data/                     # synthetic source and provenance
docs/                     # feature contract, decisions, progress and reference boundary
```

See [docs/feature-contract.md](docs/feature-contract.md), [docs/decisions.md](docs/decisions.md), [docs/progress.md](docs/progress.md) and [DESIGN.md](DESIGN.md) for invariants, architecture, remaining source-plan gates and visual rules.

## Demo behavior and limits

- The browser demo stores bookings only in local storage and is for interaction review. Clear site data to reset it.
- Default server mode creates a separate anonymous demo account per browser session. Opt-in customer-auth mode instead requires registration/login and disables `/api/session` and `/api/bookings/{id}/demo-payment`. An HttpOnly session cookie and CSRF token protect mutations; sessions remain in-memory and are lost on backend restart. A PostgreSQL-backed session version revokes all existing sessions of an account on demand.
- A scheduled server job keeps the fictional showtimes available for the coming week. Existing bookings and sold seats are never reseeded.
- QR images encode random demo ticket tokens, but there is intentionally no real check-in service.
- The demo payment endpoint, available only in demo mode, records simulated outcomes and amounts; it never asks for or stores card details. Customer-auth mode has no payment endpoint yet.
- The showtime editor exists only in the browser demo. Server mode deliberately hides its navigation and has no production admin, role-based access, staff check-in, refund, voucher, concession, loyalty, rating, comment or email feature yet.
- Current Beta Cinemas listings are not bundled or claimed.
- Flyway V1–V4, repeated CSV import, concurrent-seat tests and two-device session revocation passed against local PostgreSQL 18.6 instances. The Compose deployment itself, backup/restore, sustained load and staging recovery have not been certified.
- Real MoMo merchant checkout, signed provider notification, VietQR transaction verification, refund/reconciliation and production go-live remain gated on provider credentials, a business receiving account, licensed content and approved business policies. Displaying a VietQR code alone is never proof of payment.

## Generated artwork

`frontend/public/assets/cineviet-hero.png` was generated with OpenAI's built-in image generation tool for this project. Final prompt intent: an original Vietnamese cinema corridor rendered with black lacquer, cobalt, rose and champagne practical lighting, anonymous visitors, dark copy space, no brand, no text, no copyrighted characters, and safe responsive cropping.
