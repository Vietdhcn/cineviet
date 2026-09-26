---
name: CineViet
description: A lacquer-lightbox cinema interface for truthful local catalogue and seat-hold workflows.
colors:
  canvas: "#090b14"
  canvas-deep: "#05060b"
  surface: "#111522"
  surface-raised: "#181d2c"
  surface-soft: "#202638"
  text: "#f7f1e8"
  text-muted: "#c0c4d1"
  text-faint: "#8c93a8"
  cobalt: "#496dcc"
  cobalt-deep: "#16255c"
  rose: "#d84d5e"
  rose-dark: "#8f2939"
  champagne: "#f2cb83"
  ink: "#17131a"
  success: "#80c7a0"
  danger: "#ff8b96"
  focus: "#ffe3a9"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, sans-serif"
    fontSize: "clamp(2.6rem, 6vw, 5.7rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  surface: "14px"
  control: "10px"
  small: "8px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "46px"
  button-ghost:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "46px"
---

# Design System: CineViet

## Overview

**Creative North Star: "The Lacquer Lightbox"**

CineViet feels like entering a dim screening corridor: black lacquer frames the film, cobalt recedes into depth, rose marks the next action, and champagne signals a useful cue. The catalogue is expressive but the booking flow is operational and calm. Original artwork keeps the project distinct from any cinema brand; unverified schedules and prices are never shown as real.

**Key Characteristics:** editorial headlines, restrained theatrical light, legible Vietnamese body copy, and a clear route from showtime to seat hold.

## Colors

Rose is reserved for the primary action. Champagne highlights cues, selected details and the paper-ticket surface. Cobalt creates depth without becoming the default action color. The dark canvas and raised surfaces keep selection and availability states discernible.

**The One Primary Action Rule.** On any task step, one rose action should dominate; supporting actions use outline or quiet treatment.

## Typography

Bricolage Grotesque Variable gives film titles and page headings character. Be Vietnam Pro carries Vietnamese paragraphs, labels and transaction details. Keep body copy comfortable at 16px and let headings wrap rather than clip. Use tabular numerals for prices and countdowns.

## Layout

Content is centered in a 1240px maximum shell. The landing page uses a large image-led first view; booking pages narrow attention to the current task. At 390px the booking summary stacks after the main content; actions remain full-width where needed. Spacing follows an 8/16/24px rhythm.

## Elevation & Depth

Depth comes mainly from tonal surfaces, the hero image, and an offset soft shadow (`0 24px 70px rgba(0,0,0,.38)`). Avoid a glow around every panel.

## Future operations surface

Any future operations UI must read and write through an authenticated, cinema-scoped backend with audit. It must not store schedules in the browser as an operational source of truth.

## Shapes

Controls use gently rounded corners (8–10px); larger surfaces use 14px. Pills are for small labels, not full-size cards. The seat map uses a consistent grid of compact physical-seat shapes.

## Components

Buttons maintain a 46px minimum height, visible focus ring, clear disabled state, and lift only on pointer hover. The rose button advances a task; ghost and quiet variants support navigation or recovery. Cinema/date fields stay native controls with visible labels. Selection chips show both color and a check icon. No ticket is displayed before verified payment exists.

## Do's and Don'ts

- Do explain empty data and unavailable payment plainly.
- Do use the existing semantic CSS tokens and one Lucide icon language.
- Do keep seat availability, totals, timer and recovery actions readable without relying on color alone.
- Don't import real cinema branding, posters or unverified current listings.
- Don't turn task pages into nested-card dashboards or use decorative gradients for key text.
