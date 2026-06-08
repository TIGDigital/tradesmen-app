# Phase

A live project workspace for UK home-improvement work, shared between the tradesman, their crew, and the customer.

> **We'll never leave you wondering.**

Phase is the iOS app a tradesman gives their customer at the start of a £5k–£100k job — kitchens, bathrooms, extensions. End-of-day updates, photos, voice notes, ETAs, and a leave-site nudge that fires the moment the tradesman drives away. Invite-only. No marketplace, no public directory, no advertising.

The app is built as a calm instrument cluster, not an anxious feed.

---

## Status

Pre-launch. MVP feature-complete, in TestFlight prep.

- **Built:** the entire feature surface — auth, projects, milestones, updates, photos + voice, chat, geofence leave-site nudge, multi-cert verification, apprentice approval queue.
- **Live in production (Supabase):** every database migration through Sprint 39.
- **External blockers before App Store submission:** Apple Developer enrolment, Twilio UK regulatory bundle.

---

## Stack

| Layer | Tooling |
|-------|---------|
| App | Expo SDK 56 (React Native) + TypeScript + Expo Router |
| State | Zustand + TanStack Query |
| Backend | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) |
| Auth | Supabase Auth (email + Apple/Google) + Twilio Verify for SMS |
| Push | Expo Notifications via APNs |
| Location | `expo-location` — When-in-Use only, geofence events only |
| Analytics | PostHog |
| Errors | Sentry |
| Fonts | Geist + Geist Mono |
| Build & ship | EAS Build + EAS Submit |

---

## Project structure

```
/app                  # Expo Router screens
  /(auth)             # Welcome, sign in/up, role select
  /(customer)         # Dashboard, updates, messages, inbox, account
  /(tradesman)        # Jobs, crew, messages, inbox, account
  /(apprentice)       # Today, EoD
  /project/[id]       # Detail, chat, photos, schedule, snags, crew, approvals
  /settings           # Edit name, business, verification, certificate/[id]
  /tradesman/[id]     # Public profile
/components
  /ui                 # Atoms — Button, Card, StatusBadge, InputField, etc.
  /                   # Composed — PhaseLogo, PhaseProgressRing, MediaThumbs, NotificationsView
/services             # Supabase wrappers — auth, projects, messages, media, snags, crew, tradesman
/stores               # Zustand stores
/theme                # Phase Design System tokens (warm Stone neutrals, Phase blue, Geist Mono captions)
/types                # TypeScript types generated from the Supabase schema
/hooks                # Realtime + presence hooks
/supabase
  /migrations         # SQL migrations — one file per change, never edited after ship
  /functions          # Edge Functions (send-invite-sms)
/docs                 # Privacy policy (HTML + Markdown), other publishable assets
```

---

## Reference documentation

Long-form planning docs live in this repo's root. Skim in order if you want context:

- `01_MVP_Product_Strategy_and_Roadmap.md` — thesis, personas, MVP scope, build plan
- `02_Technical_Architecture_and_DB_Schema.md` — Postgres schema, RLS policies, Edge Functions
- `03_Design_System_and_Screen_Specs.md` — tokens, components, screen-by-screen specs
- `07_Production_Roadmap.md` — phased delivery plan
- `SHIP.md` — concrete App Store submission playbook
- `CLAUDE.md` — Claude Code orientation
- `11_Final_Prototype.html` — interactive visual reference for every screen (open in browser)

---

## Critical product rules

These are not preferences — they're load-bearing decisions documented as constraints.

1. **No customer search or public tradesman directory.** Customer entry is invite-only. Forever.
2. **Location is When-in-Use only.** No background GPS, no live map. Geofence boundary events only.
3. **No payment UI in the MVP.** Stripe is post-launch.
4. **Three roles.** `customer`, `tradesman`, `apprentice`. `admin` is internal only.
5. **The leave-site nudge is the wedge.** It must work before anything else.

---

## Getting started

Prerequisites: Xcode 15+, Node 20+, the iOS Simulator, a Supabase project.

```bash
# 1. Clone + install
git clone git@github.com:TIGDigital/tradesmen-app.git
cd tradesmen-app
npm install

# 2. Configure env
cp .env.local.example .env.local
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
# from your Supabase project's API settings.

# 3. Push migrations to your Supabase project
# Either via the Supabase CLI:
supabase db push
# Or via the SQL editor in the dashboard (paste each file from
# supabase/migrations/ in chronological order).

# 4. Regenerate TypeScript types from the schema
supabase gen types typescript --local > types/db.ts

# 5. Start Metro on the simulator
npx expo start --ios --clear
```

---

## Conventions

- **File names** — kebab-case for screen routes (`project-detail.tsx`), PascalCase for components (`StatusBadge.tsx`).
- **Imports** — absolute, via the `@/` alias to the repo root.
- **TypeScript** — strict mode, no `any`.
- **Style** — 2-space indent, single quotes, trailing commas.
- **Commits** — Conventional Commits (`feat:`, `fix:`, `chore:`, `style:`, `refactor:`, `docs:`).
- **Migrations** — one SQL file per change, immutable once shipped. Roll forward only.
- **Tests** — co-located: `Button.tsx` and `Button.test.tsx` live in the same folder.

---

## Privacy

The Phase privacy policy is published at:

[https://tigdigital.github.io/tradesmen-app/privacy.html](https://tigdigital.github.io/tradesmen-app/privacy.html)

Source files: [`docs/privacy.html`](docs/privacy.html) and [`docs/privacy.md`](docs/privacy.md).

For data requests or privacy questions: **t.bullions@gmail.com**.

---

## Licence

All rights reserved. The source is published for transparency, not redistribution.
