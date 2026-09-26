# Architecture decisions

## ADR-001 — Modular monolith

React/TypeScript is a separate presentation application. Java 21 + Spring Boot 4.1.1 owns demo session identity, catalogue, booking, simulated payment and recommendation modules in one deployable backend. PostgreSQL 18.6 is the authority for holds and sales. This avoids Redis, WebSocket and service-discovery complexity in the MVP.

## ADR-002 — Demo adapter and server adapter

The frontend depends on the narrow `CinemaGateway` contract. Local visual development defaults to `DemoCinemaGateway`, which labels all state as simulated and persists only in browser local storage. Docker builds set `VITE_API_MODE=server`, selecting `HttpCinemaGateway` against the real Spring/PostgreSQL API. Presentation components do not access storage or `fetch` directly.

## ADR-003 — Lock ordering

A new hold locks the current session's demo account, expires its stale hold, locks the showtime and then locks requested `showtime_seats` by ascending UUID. Confirmation locks the booking and owned seats before validating the hold against the database clock. The worker uses `FOR UPDATE SKIP LOCKED`. All prices and expiry timestamps come from PostgreSQL/backend state. Hold and simulated-payment requests require an idempotency key; reusing one with a different request is rejected.

## ADR-004 — Recommendation

Recommendation stays deterministic and explainable. It filters candidates to future showtimes with available seats for the requested cinema/date. It averages vectors from distinct confirmed films, blends that history profile with the visitor's selected genres, then combines cosine similarity with 30-day distinct-account popularity. Stable tie-breaks and evidence-backed reason codes make the order inspectable.

## ADR-005 — Original demo identity

CineViet uses an original lacquer-lightbox visual system and fictional Vietnamese catalogue. Beta Cinemas is only a documented workflow reference; no logo, poster, current listing or affiliation claim is included.

## ADR-006 — Anonymous demo sessions

Each browser session creates its own database account on `GET /api/session`. The session cookie is HttpOnly/SameSite=Lax, and writes require a matching CSRF token. This isolates booking history between demo visitors but is not an authenticated, durable user system; a backend restart loses the in-memory session. No real customer identity or payment credential is collected.
