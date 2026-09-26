# V2 P1 slice: demo film catalogue and offline CSV import

## Job and boundary

An operator can review `data/movies.reference.csv` against the demo database, then deliberately apply it from a non-web backend process with scheduled workers disabled. The import is not an HTTP API or a production content approval workflow. `catalog` owns parsing and upsert; Flyway owns seed/schema changes. Customer pages read published films through the existing gateway.

## States and acceptance

- The command defaults to dry-run and reports total/new/existing rows. A malformed row identifies its CSV line and prevents any writes. An explicit `apply=true` performs one transaction; failure rolls it back.
- `sourceKey` is unique and stable; a second import updates the same film instead of inserting another. A source key or slug collision with a different film is rejected.
- `BETA_REFERENCE` may be imported only as `DRAFT` with a source URL and access time. Synthetic demo films carry rights notes and no claim of current cinema listings.
- The CSV, database seed and browser demo contain twelve distinct fictional films. Booking, seat ownership, payment and recommendation rules remain unchanged; the new films receive future demo showtimes.

## Evidence still required

Run V2 migration, dry-run, apply, second apply and row-count/ID comparison on PostgreSQL. Java tests prove parser and dry-run behavior but cannot prove database idempotence or Flyway migration on the target engine.
