# Phase (tradesmen-app) — master context

Last updated: 21 July 2026. Written from the codebase, docs and commit history at that date.

## 1. What it is

One line: a shared live project workspace for UK home-improvement jobs, connecting the tradesman, their crew and the customer in one iOS app.

Phase gives every building project a private workspace. The tradesman posts updates, photos and an end-of-day summary; the customer follows along, chats and approves things without chasing anyone. The brand promise, used across the product: "We'll never leave you wondering."

## 2. Problem and target user

The problem: during a £15k to £80k refurb or extension, the customer lives in an information vacuum. They feel rude chasing, fear being taken advantage of, and message the tradesman constantly. The tradesman loses about an hour a day answering "just checking in" messages across 5 or 6 jobs. Good work still earns bad reviews when communication goes quiet.

Three personas, all defined in the strategy doc:

- Primary payer: "Dave the builder". 35 to 55, runs a 1 to 4 person operation, 2 to 6 active jobs, lives on WhatsApp and phone calls. Will pay for anything that cuts inbound calls without adding admin.
- Primary beneficiary: "Sarah the homeowner". 32 to 55, anxious first or second big project, spending £15k to £80k. Never pays; the tradesman invites her in.
- Tertiary: "Jamie the apprentice". 18 to 24, on site daily, logs what he did today and gets his updates approved by the lead.

Explicitly not for: large contractors with PMs, sub-£500 call-out work, or customers shopping for a tradesman.

## 3. Why it exists

Side project of Todd Bullions, founder of TIG Digital (a digital consultancy). Built solo with AI assistance as a potential future standalone business.

The strategic bet: every existing UK product in this space (Checkatrade model) is a lead-gen directory that tradesmen resent paying for. Phase deliberately refuses to be a directory. Customers can only enter by invite from their tradesman, so tradesmen bring the demand side in for free and the product serves them rather than taxing them. The wedge feature is the leave-site nudge: a geofence event prompts the tradesman to send an end-of-day update at the exact moment it takes least effort, which builds the habit that keeps customers calm.

## 4. Current status

Stage: MVP on TestFlight, in private testing. Not launched. No public users.

Working today (built and shipped in build 1.0.0 (18), 20 July 2026):
- Full auth: email sign-up, role select, sign-in, password reset, account deletion
- Project creation with UK postcode address lookup and trade-template milestones
- Timeline feed: updates with photos, voice notes, comments, reactions, all realtime
- 1:1 tradesman-customer chat with typing indicators and push notifications
- Leave-site nudge (geofence, WhenInUse permission only) and end-of-day update flow
- Per-project recurring end-of-day reminders
- Customer invite via SMS code; customer dashboard with progress ring
- Price change requests with customer approval and an audit log ("no surprise bills")
- Crew: apprentice invites, apprentice-authored updates gated by a lead approval queue
- Documents (PDF upload and viewer), snags with resolution photos and customer sign-off, Gantt-style schedule
- Onboarding: personalised welcome, 5-slide tour, 5-item get-started checklist
- Branded loading states (spinning Phase ring) throughout

In progress: full end-to-end re-test of build 18 against the scripted test plan in 12_Project_Log.md section 6. A crash that blocked every fresh signup through early July was root-caused (a navigation loop in the auth gate) and verified fixed on 19 July.

Not built yet: payments (deliberately removed), Android release, tradesman subscription and billing, verified badges, video uploads, web customer view, crew shift logs. Sentry and PostHog are named in the docs as the intended error and analytics tools but are not integrated.

## 5. Tech stack and architecture

- App: Expo SDK 56 (React Native), TypeScript strict, expo-router file-based navigation. iOS only so far.
- State: Zustand for client state, TanStack Query for server state.
- Backend: Supabase. Postgres with row-level security (36 migrations), Auth, Realtime subscriptions, Storage for media, Edge Functions (send-invite-sms, delete-my-account).
- Push: Expo Notifications. Location: expo-location geofencing, WhenInUse only.
- Build and release: EAS Build and EAS Submit to TestFlight, run non-interactively. Over-the-air JS updates are disabled in app.json; every change ships as a native build (a July decision after locally-bundled OTAs caused boot crashes).
- Error handling: custom root ErrorBoundary plus an AsyncStorage crash trap that replays fatal errors on next launch. No third-party error service yet.

Shape: a thin client talking directly to Supabase. No custom server. Postgres RLS enforces the three-role permission model; Edge Functions handle the few things that need secrets (SMS via Twilio, account deletion).

## 6. Business model

Nothing monetised today. Revenue to date: £0.

Intended model (from the strategy doc, not yet validated):
- MVP period: free for everyone, capped at roughly 6 months. Goal is retention, not revenue.
- V1 (about month 7): tradesman subscription. Free tier with 1 active project; Pro at £29/month or £290/year (unlimited projects, verified badge, custom branding); Team at £79/month (up to 5 tradesmen). Customers free forever.
- Possible later 1% take rate on payments, waived for Pro. Payments themselves are currently out of the product entirely.
- Illustrative unit economics: target LTV about £522 at 18-month payback, acceptable CAC £100 to £150. Acquisition via direct outreach and tradesman referrals.

## 7. Roadmap

1. Finish the scripted end-to-end re-test on build 18 (signup through crew flows) and fix whatever it surfaces.
2. Recruit a small group of real tradesmen onto TestFlight and get at least one real project running end to end.
3. Integrate Sentry and PostHog so crashes and the north-star metric are measurable before launch.
4. App Store public launch (iOS).
5. Go-to-market push to the first 100 tradesmen, then build the V1 subscription.

## 8. Key decisions made

- Invite-only customer entry, forever. No search, no public directory. This is the core positioning against the Checkatrade model, documented as permanent.
- No payments in MVP. Stripe was removed entirely; the MVP ships and is judged without it.
- Location is WhenInUse geofencing only. No continuous tracking, no live map. Chosen for App Store approval and GDPR defensibility.
- Three roles only: customer, tradesman, apprentice. Admin is internal.
- Bundle ID com.tigdigital.phase is locked.
- OTA updates banned (July 2026). Locally-bundled OTAs boot-crashed on device; every change now ships as a native EAS build even when JS-only.
- Solo-founder stack: Expo plus Supabase, no custom backend, so one person can ship everything.
- App name is Phase; the repo and early docs use the working title "Tradesmen Uber".

## 9. Open decisions and risks

Open decisions:
- Launch timing and TestFlight tester recruitment plan. TBD.
- Android: supported by the stack but no build shipped. TBD.
- Final pricing (the £29/£79 tiers are a hypothesis, not tested). TBD.
- Whether payments ever return, and in what form. TBD.
- Company structure for the product versus TIG Digital. TBD.

Main risks:
- Zero real-user validation so far. Every feature exists but no tradesman has run a real job through it.
- Solo founder, side project. Progress depends on one person's time.
- The wedge depends on tradesmen granting location permission and forming the habit. Unproven.
- Stability history: signup was broken for two weeks in July. Fixed and verified, but device diversity is untested beyond a few iPhones.
- No analytics or error reporting integrated yet, so a quiet failure in the field would be invisible.

## 10. Metrics

Real numbers today: 0 customers, 0 revenue, no external testers actively using it. 129 commits since 26 May 2026. Test data only.

Worth tracking from launch (defined in the strategy doc):
- North star: active projects with a customer-side login in the last 14 days.
- Tradesman D30 retention (target above 60%) and customer D14 retention (above 50%).
- Updates per active project per week (above 3).
- Time from project creation to first update (under 24 hours).
- Share of tradesmen who run more than one project (above 40%).
- Anti-metrics, deliberately not optimised: total signups, DAU, session length.

## 11. Location and assets

- Repo: /Users/tig_todd/Desktop/tradesmen-app (local), git@github.com:TIGDigital/tradesmen-app.git (GitHub, private, org TIGDigital).
- Live URL: none. Privacy policy is published at https://tigdigital.github.io/tradesmen-app/privacy.html.
- Distribution: TestFlight, App Store Connect app ID 6778531543, Apple team 648JTT782L.
- Backend: Supabase project ref gzzznhqvwyuyvzociydw. SQL is applied via the Supabase Management API, one migration file per change in supabase/migrations.
- Key docs, all in the repo root: 01_MVP_Product_Strategy_and_Roadmap.md (strategy, personas, monetisation), 02_Technical_Architecture_and_DB_Schema.md (schema and RLS), 03_Design_System_and_Screen_Specs.md (design tokens and screens), 07_Production_Roadmap.md (phased plan), 11_Final_Prototype.html (clickable visual reference), 12_Project_Log.md (the living build log, including the July crash post-mortem), CLAUDE.md (AI working instructions).
- Brand assets: assets/brand/ (the Phase ring mark as SVG).

## One-paragraph brief

Phase is an iOS app by Todd Bullions (TIG Digital side project) that gives UK home-improvement projects a shared live workspace for the tradesman, their crew and the customer. It attacks customer anxiety on £15k to £80k jobs: the tradesman posts photo updates and a one-tap end-of-day summary (prompted by a geofence nudge when they leave site), and the customer watches progress instead of chasing. Customers join by invite only; it is deliberately not a directory. Built solo on Expo and Supabase, it is feature-complete as an MVP, on TestFlight at build 1.0.0 (18) after a hard-won stability fix, with zero real users and zero revenue so far. The plan: validate with real tradesmen, launch free on the App Store, then charge tradesmen about £29 a month once retention is proven.
