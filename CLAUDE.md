# Tradesmen Uber — Claude Code orientation

This is the file Claude Code reads first to understand the project. Keep it short and current.

## What this is

A live project workspace shared between the tradesman, their crew, and the customer. UK home-improvement projects (£5k–£100k+). Three personas, invite-only customer model, leave-site nudge as the wedge feature.

Read `01_MVP_Product_Strategy_and_Roadmap.md` if you need the full thesis. The one-line bumper is: *"We'll never leave you wondering."*

## Stack

- **App:** Expo SDK 51+ (React Native) + TypeScript + Expo Router
- **State:** Zustand + TanStack Query
- **UI:** native iOS where possible; design tokens from `03_Design_System_and_Screen_Specs.md`
- **Backend:** Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **Auth:** Supabase Auth (Apple, Google, email) + Twilio Verify for SMS
- **Push:** Expo Notifications
- **Location:** `expo-location` (geofencing — `WhenInUse` only)
- **Payments (V1):** Stripe Connect Express
- **Analytics:** PostHog
- **Errors:** Sentry
- **CI/CD:** EAS Build + EAS Submit

## Project structure (when scaffolded)

```
/app                  # Expo Router screens
  /(auth)             # Sign in, phone verify, role select
  /(tradesman)        # Jobs, project, EoD, crew, account
  /(customer)         # Project, updates, messages, account
  /(apprentice)       # Today, EoD, progress, account
/components
  /ui                 # Atoms — Button, Card, StatusBadge, etc.
  /                   # Composed — TimelineUpdate, EoDCard, ChatBubble
/services             # API clients (Supabase wrappers, Stripe, etc.)
/stores               # Zustand stores
/theme                # tokens.ts, light.ts, dark.ts
/types                # TypeScript types (generated from Supabase)
/supabase
  /migrations         # SQL migrations (one per change)
  /functions          # Edge Functions
  schema.sql          # Reference schema
```

## Reference docs (in this folder)

- `01_MVP_Product_Strategy_and_Roadmap.md` — strategy, personas, MVP scope, build plan
- `02_Technical_Architecture_and_DB_Schema.md` — Postgres schema, RLS, Edge Functions
- `03_Design_System_and_Screen_Specs.md` — tokens, components, screen specs
- `07_Production_Roadmap.md` — phased delivery plan
- `11_Final_Prototype.html` — visual reference for every screen (open in browser)

## Critical product rules (do not violate)

1. **No customer search / public tradesman directory.** Customer entry is invite-only, forever. Documented strategic position, not a backlog item.
2. **Location is `WhenInUse` only.** No continuous GPS, no live map view. Geofence events only. App Store + GDPR defensible.
3. **No payment UI yet.** Stripe is V1 (post week 10). MVP ships without it if Stripe slips.
4. **Three roles:** `customer`, `tradesman`, `apprentice`. The `admin` role is internal only.
5. **The leave-site nudge is the wedge.** It must work before anything else — Phase 3.

## Where we are now

Code: nothing written. Designs/specs/prototype: complete. This is sprint 0 — scaffold time.

## What "done" looks like for the MVP

TestFlight build with: tradesman creates project → customer joins via SMS → timeline feed + photos → 1:1 chat → leave-site nudge → end-of-day update lands on customer's Updates tab. That's it. No Stripe.

## How to work with me (Claude Code)

- Show me the file before you change it, unless it's a fresh file.
- Prefer Expo SDK APIs over raw React Native APIs where they exist.
- Generate TypeScript types from Supabase schema using `supabase gen types typescript --local`.
- One SQL migration per change. Never edit migrations that have shipped.
- Write small components. Long components mean a missed extraction.
- Tests live next to the file they test: `Button.tsx` / `Button.test.tsx`.

## Conventions I follow

- File names: kebab-case for screens (`project-detail.tsx`), PascalCase for components (`StatusBadge.tsx`)
- Imports: absolute via `@/` alias to project root
- No `any`. Strict TypeScript.
- 2-space indent. Single quotes. Trailing commas.
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`)
