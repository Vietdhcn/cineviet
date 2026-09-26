# CineViet

CineViet is a cinema-booking project being prepared for real operational data. It is **not open for ticket sales**. The public [GitHub Pages site](https://vietdhcn.github.io/cineviet/) displays a launch-status page only; GitHub Pages does not run the Java API or PostgreSQL. [plan.html](plan.html) records what has been verified and what remains.

## Current behavior

- The frontend uses the HTTP API only. It does not create browser-local bookings or offer simulated payment.
- The backend defaults to customer sessions (`cineviet.customer-auth-enabled=true`), with demo session/payment routes and generated fictional showtimes off by default (`cineviet.demo-enabled=false`).
- Flyway V5 hides the twelve fictional movies and deactivates the three fictional venues seeded by older migrations. It preserves historical booking records and their foreign keys. Until approved data is imported, the catalogue is empty.
- Customers can register, log in, hold or cancel seats on PostgreSQL and log out everywhere in a local environment. A hold does not create a paid ticket; payment is deferred.
- Do **not** expose the backend publicly yet. Email verification/recovery, durable abuse controls, staff authorization/MFA, operational backup/restore, licensed data and staging UAT are missing.

Older demo adapters, seed migrations, synthetic CSV and local tests remain in the repository as historical development material. Do not enable `cineviet.demo-enabled` or import `data/movies.reference.csv` into an operational database. Historical tickets are not valid for check-in.

## Run locally on a personal computer

Requires Docker Compose v2, or Java 21, PostgreSQL and Node.js 22.12+ installed separately. With Compose:

```powershell
Copy-Item infra/.env.example infra/.env
# Set a strong local PostgreSQL password in infra/.env.
docker compose --env-file infra/.env -f infra/compose.yaml up --build
```

Open `http://localhost:8088`. Compose binds the web app and PostgreSQL to `127.0.0.1` only. Do not forward these ports to the Internet. Stop without deleting data:

```powershell
docker compose --env-file infra/.env -f infra/compose.yaml down
```

For a separate frontend development server, run `npm ci` and `npm run dev` inside `frontend/`. Its `/api` requests require a running backend; without one it shows a connection error instead of fabricated data.

## Verification

```powershell
node --test public-site/site.test.mjs backend/safety.test.mjs
cd frontend
npm ci
npm run lint
npm test
npm run build
cd ../backend
mvn test
```

The current source includes 19 frontend tests and 22 Java tests. The new safety tests verify the public page, backend defaults and synthetic-data withdrawal contract. Flyway V1–V5 ran on a separate local PostgreSQL 18.6 test database: 12 fictional movies were hidden, three fictional cinemas made inactive, and five historical showtimes preserved. A browser flow with authorized data and a recovery exercise are still required before accepting the new configuration as complete.

## Inputs needed for the next real feature

Provide the actual cinema/operator, authorized movie and venue data, rooms/seats, showtimes and prices, plus who may approve publication and what rights apply to images. A personal computer is sufficient for local development and internal checks; public access additionally needs secure hosting, domain/HTTPS, backup, monitoring and an operator. Payment credentials are **not needed now**.

See [plan.html](plan.html) for the work sequence and go/no-go conditions. The application is not affiliated with Beta Cinemas.
