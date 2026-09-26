# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + TypeScript frontend, Java 21 + Spring Boot backend, PostgreSQL persistence. Docker Compose is configured for local use but has not been accepted on this machine.

## Users and purpose

CineViet aims to help Vietnamese cinema customers discover authorized showtimes and reserve seats. Staff, managers and system administrators will later maintain schedules, prices and admissions within scoped permissions. Today, only local customer identity, catalogue-reading and seat-hold foundations exist. No cinema has supplied authorized operational data; the application is not open for sales.

## Current operating context

- The frontend calls the Java API; PostgreSQL is authoritative for accounts, seat holds and prices.
- Users can register, log in, log out, revoke sessions and, when a real showtime exists, hold/cancel seats. Email ownership is not verified yet.
- The catalogue is empty. Historical synthetic seed is hidden/removed by Flyway V5/V6, with referenced history retained. No browser-local catalogue or schedule editor is available.
- There is no payment route, paid ticket, check-in or public backend deployment. GitHub Pages is unpublished.

## Constraints and future work

- Identity needs email verification, recovery, abuse controls and review before public use.
- Administration needs role and cinema scopes, MFA, audit and persistent management APIs.
- Film, venue, room, seat, showtime, price and media data must be supplied and approved by an authorized operator.
- Payment, signed provider notifications, reconciliation, ticket issue and check-in follow only after the preceding work is accepted. A generated QR code alone never proves payment.
- Do not use Beta Cinemas branding or imply affiliation. Beta workflow material in older planning documents is a reference, not a data license.

## Product principles

1. Do not invent or silently fill missing operational data.
2. Correct seat ownership and truthful financial state outrank visual breadth.
3. Local test evidence must be distinguished from production acceptance.
4. One clearly labeled primary action per task step; empty and error states explain what is missing.
5. Public launch requires licensed content, security review, backup/restore, monitoring and an operator decision.

## Accessibility

Primary journeys should work with keyboard-only input, visible focus, semantic controls, screen-reader labels, reduced motion, 200% text scaling and WCAG 2.2 AA contrast. Re-test with authorized content before acceptance.
