# Payment direction: MoMo + VietQR

Decision supplied by the project owner on 2026-09-24: prepare CineViet for real ticket sales with **MoMo and VietQR**. This document is an integration contract, not proof that either payment channel is live.

## Distinguish the two channels

- **MoMo**: integrate its hosted checkout/Collection Link in sandbox first. The backend creates an attempt from the booking's server-side VND amount, signs the create request, stores `partnerCode`, `orderId`, `requestId`, amount and expiry, then redirects the customer to `payUrl`. A server-to-server POST IPN is the authoritative event. The browser `redirectUrl` only displays a pending/result screen. Verify signature, partner, order, amount and current state before issuing any ticket. MoMo documents `resultCode=0` as successful, while `9000` means authorized, not captured. Respond to a processed IPN promptly according to the provider contract. [MoMo Collection Link](https://developers.momo.vn/v3/docs/payment/api/collection-link/), [MoMo Payment Notification](https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/).
- **VietQR** is a QR payment format, **not by itself a verified receipt**. The project owner must choose the receiving business bank account and a bank/PSP or VietQR Payment Kit partner that supplies authenticated transaction notifications or a reliable transaction-query API. Merely displaying an account-number/amount/reference QR, or a customer clicking “I paid”, must never confirm a booking. VietQR.io/Casso offers separate QR generation and Payment Requests/webhook APIs; use of that product is not assumed until the owner selects and contracts it. [QR generation](https://vietqr.io/en/generate/), [Payment Requests/webhook](https://www.vietqr.io/en/paymentRequests/).

## Shared invariant and release gate

1. One unique provider attempt/reference per booking. Create from a short-lived `HELD` booking; do not hold an open DB transaction during a provider call. The payment window and seat-hold deadline must be reconciled before money can be accepted.
2. Persist payment attempt `PENDING/SUCCESS/FAILED`, provider event ID, raw-event digest, verified amount/currency and processing time. Deduplicate by provider transaction/event ID; replays return the prior outcome.
3. On verified success within a valid hold, atomically mark seats `SOLD`, booking `CONFIRMED`, payment `SUCCESS`, and create exactly one ticket per seat. If money arrives after the hold expired or seats were released, record `REFUND_REQUIRED` and alert operations; do not issue a ticket or reclaim seats.
4. A timeout, browser closure, missing IPN or ambiguous QR transfer stays `PENDING`; reconcile by provider transaction query/bank statement before declaring failure or success. Failed and refundable payments must be visible to staff with a documented manual escalation route.
5. DEMO and production credentials, database, URLs and data must be separate. No production payment link or VietQR payee data enters the UI until merchant onboarding, business account, refund policy, licensed film/schedule data, authenticated admin, UAT, load tests and operational ownership are approved.

## What is in code today

`backend/.../payment/MomoSignature.java` implements the published MoMo HMAC-SHA256 canonical field order for create and notification verification, with tests for changed amount/order, missing fields and authorized-vs-captured result. It does **not** call MoMo, accept an IPN, update a booking, reconcile, refund, or enable a real payment button. The existing checkout remains explicitly simulated.

## Inputs still required

- MoMo sandbox merchant `partnerCode`, `accessKey`, `secretKey`, configured public HTTPS IPN/return URLs, then production merchant approval.
- For VietQR: receiving business bank/BIN/account name/account number, chosen notification/statement provider and its credentials, webhook authentication contract, supported refund path and settlement timing.
- Approved hold/payment expiry policy, ticket cancellation/refund policy, support contacts, and launch/cinema scope.
