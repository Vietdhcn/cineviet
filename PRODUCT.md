# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript frontend, Java 21 + Spring Boot backend, PostgreSQL persistence, and Docker Compose for local delivery. Recommendation remains a module in the Java application. The v2 plan extends this modular monolith rather than replacing the stack.

## Users

Primary users are Vietnamese cinema-goers who need to discover a film, find a local showtime, reserve seats, pay and retrieve tickets. Cinema staff need to check tickets; cinema managers need to maintain schedules, prices and operations; super administrators need system-wide governance. Today only the customer demo journey and a local demo showtime editor are implemented. A reviewer must be able to reproduce and inspect the project locally.

## Product Purpose

CineViet is a Vietnamese cinema-booking project evolving from an educational demo toward a full customer, operations and payment platform. The v2 target includes real identity and role-scoped administration, showtime and price management, safe seat booking, provider-backed payment, QR admission and reconciliation. The current executable product is still a demo; a production launch requires business, legal, merchant and operational approval.

## Positioning

CineViet combines safe seat ownership and clear ticket status with transparent film discovery and practical cinema operations, without implying affiliation with Beta Cinemas.

## Operating Context

In the current demo, users browse by cinema/date, select a showtime and 1–8 seats, hold for five minutes, complete simulated payment and revisit QR tickets. Reviewers can use `/dieu-hanh` in browser-only demo mode to create/cancel local showtimes and see those changes in the public catalogue. Server mode has no admin authentication or management mutations yet. The v2 production target adds real accounts, roles, provider-backed payment, check-in, refund and reporting.

## Capabilities and Constraints

- F01: browse catalogue and showtimes, keyboard-accessible seat selection, atomic seat hold, simulated payment, booking history, and one QR ticket per booking item.
- F02: recommendations derived from preferred genres and distinct confirmed movies, blended with 30-day popularity, filtered to published movies with future available showtimes, with evidence-backed reason codes.
- Booking states are `HELD`, `CONFIRMED`, `CANCELLED`, and `EXPIRED`; showtime-seat states are `AVAILABLE`, `HELD`, and `SOLD`.
- Holds last five minutes but never extend beyond showtime start. PostgreSQL is authoritative for seat ownership and sale.
- Payment is currently demo-only, uses no real card data, and must never be presented as real payment. Hosted provider checkout, signed notifications and reconciliation belong to future v2 phases.
- The owner chose MoMo and VietQR for future real sales. VietQR QR generation alone does not verify bank receipt; a bank/PSP notification or query contract is required before any ticket may be issued.
- Beta Cinemas is a workflow and lawful metadata reference only. CineViet has its own identity and does not claim to be an official Beta property.
- The browser-only demo showtime editor has no authentication or role enforcement and must never be exposed as production admin. Server-side admin, revenue, refund and check-in are v2 work still to be implemented. Vouchers, concessions, loyalty, ratings and comments are later priorities.
- Synthetic catalogue and showtime data must be labeled `DEMO`; no unverified data may be described as current Beta listings.

## Brand Commitments

The product name is CineViet. Product language is Vietnamese, direct, reassuring, and explicit about demo data and simulated payment. The identity must be original and must not use Beta Cinemas logos or imply affiliation.

## Evidence on Hand

- `Ke_hoach_Codex_Website_dat_ve_Beta.html` is the v2 target plan. `docs/feature-contract.md` records the existing F01/F02 baseline; `docs/v2-feature-contract.md` records the first demo operations slice. The plan is not evidence of implemented functionality.
- The supplied plan cites public Beta Cinemas pages for workflow reference, PostgreSQL locking documentation, and Stanford IR material for cosine similarity.
- No licensed film posters, current cinema listings, commercial claims, testimonials, or production credentials were supplied. The project must use authored demo visuals and clearly labeled synthetic data.

## Product Principles

1. Correct seat ownership and payment truth matter more than decorative breadth.
2. Staff and managers only act within their assigned scope once production identity exists.
3. Demo behavior is unmistakably labeled and never collects real payment data.
4. The shortest path from film discovery to a retrievable ticket stays obvious; recommendations explain themselves.
5. Local reproducibility, honest test evidence and explicit go-live gates are part of the product.

## Accessibility & Inclusion

The primary journeys must work with keyboard-only input, visible focus, semantic controls, screen-reader labels, reduced motion, 200% text scaling, and WCAG 2.2 AA contrast. Layouts must remain usable at 390 px and 1440 px without horizontal page overflow.
