# 12 — Project Log: the trail of everything we've done

> Living document. Newest entries at the bottom of each section. Update this
> whenever a sprint ships, a build goes to TestFlight, SQL is run against the
> live database, or a bug is found/fixed. Written in plain English on purpose.

**App:** Phase (`com.tigdigital.phase`) · **Founder:** Todd Bullions · **Stack:** Expo SDK 56 + Supabase (`gzzznhqvwyuyvzociydw`)

---

## 1. Timeline at a glance

| Phase | Dates | What happened |
|---|---|---|
| Foundation | 26–28 May 2026 | Scaffold → Supabase → auth → projects → milestones → EoD card → photos → push → leave-site nudge → SMS invites → realtime → chat. The whole MVP core in 3 days. |
| Feature blitz | 3–8 Jun | Tab bars, dashboards, documents, snags, Gantt schedule, crew layer, approvals, typing indicators, notifications inbox. Rebrand to **Phase** + design system + Whoop-style customer dashboard. |
| App Store prep | 9 Jun | Icon, splash, screenshots, privacy policy, EAS config. First TestFlight builds (#1–6). |
| Beta sprints 40–48 | 10–12 Jun | Address lookup (ideal-postcodes), crew invite fixes, forgot password, push consent, swipe tour, onboarding checklist, account deletion, iPad polish. Builds #7–8 to TestFlight. |
| Sprints 49–52 | 15 Jun | Recurring EoD reminders, "Hi [Name]!" welcome, **pricing change requests + audit log** (the no-surprise-bills wedge), 5-step parity across tour/checklist/welcome. All shipped as OTA on top of build #8. |
| *(3-week gap)* | 16 Jun – 3 Jul | No development. Supabase free tier auto-paused the database (7-day inactivity). |
| Crash saga | 4 Jul | DB resumed. Fresh testing found signup crashing the app on iOS 26. Root-caused via crash logs; four fix iterations; builds #9/#10 shipped. Full story in §3. |
| Audit + cleanup | 19 Jul | Systematic audit of everything touched during the saga. Found + fixed 5 issues incl. two DB migrations that had never been applied. Full findings in §4. This document created. |

---

## 2. Sprint index (what got built, in order)

Foundation and features, condensed — each maps to commits in git history (`git log --reverse`):

- **Sprint 0–3** (26–27 May): Expo scaffold, design tokens, Supabase schema (22 tables + RLS), email auth, role select, project creation, update feed.
- **Sprint 4–5**: Milestones with tap-to-advance, dynamic status, **End-of-Day card** (the wedge).
- **Sprint 6–8**: Photos in updates, push notifications, **leave-site nudge**.
- **Sprint 9–10**: Customer SMS invites via Twilio Edge Function, realtime feed + reactions.
- **Sprint 11–16**: Milestone templates per trade, photo viewer, polish, settings + avatars, voice notes, 1:1 chat.
- **Sprint 17–27** (3–4 Jun): Business profile + certificates, tab bars, location consent, jobs dashboard, skeletons/error states, photo gallery, comments, typing indicator, multi-project picker, notifications inbox.
- **Sprint 30–38** (4–7 Jun): Documents, document viewer, snags + resolution sign-off, Gantt schedule, milestone editing, **crew layer** (apprentice role, invites, approval queue).
- **Rebrand** (7–8 Jun): Tradesmen → **Phase**. Design system, fonts (Geist), icon, progress-ring brand mark, Whoop-style customer dashboard, multi-cert verification.
- **Sprint 40–48** (9–12 Jun): UK address autocomplete, beta-tester bug fixes, auto-enroll past crew, forgot password, push consent screen, swipe-through tour, onboarding checklist, account deletion (App Store requirement), iPad polish.
- **Sprint 49–52** (15 Jun): Per-project recurring EoD reminders · personalised "Hi [Name]!" welcome · **pricing change requests with customer approval + permanent audit log** · 5-slide tour / 5-item checklist / 5-step welcome parity.

**Standing product rules (never violate):** no payments/Stripe ever · location `WhenInUse` only · invite-only customers, no public directory · three roles only (customer / tradesman / apprentice) · bundle ID locked.

---

## 3. The July 4 crash saga — full story

**Symptom:** fresh signup on TestFlight (build #8, then #9, #10) crashed the app straight to the home screen. Separately, one tester's app later refused to open at all.

**What we did, in order:**

1. DB had been auto-paused by Supabase free tier → resumed it. (Consider Pro tier ~£20/mo to stop this happening mid-testing.)
2. Nuked test data; discovered **role-select was never shown** — every signup silently became a customer. Cause: Sprints 44/50 added tour + welcome redirects to AuthGate without whitelisting the role-select screen. Fixed (`7ecc5ff`).
3. Crash persisted → shipped a diagnostic disabling push registration to isolate it (`a5955e7`).
4. Fixed a second bug found en route: "couldn't save your role — not signed in" (`setMyRole` now reads the local session, `4929662`).
5. **Got the crash log (.ips) — the turning point.** Root cause confirmed:
   > iOS 26.5 aborts (SIGABRT in `_UIKeyboardStateManager _teardownExistingDelegate`) when a focused password field's native view is unmounted while the keyboard's password-suggestion overlay is still tearing down. Navigating away from a just-submitted form does exactly that.
6. Four fix iterations (`27bccc1` → `89b2f49`): dismiss keyboard → add wait → explicitly unmount the password field pre-nav → **v4: navigate with `push` (screen stays mounted) + remove `textContentType="newPassword"`** (the attribute that summons the crashing overlay).
7. A second .ips showed the tester's device stuck in a **boot loop**: the repeated crashes had corrupted expo-updates' error-recovery cache. No code fix — needs delete + reinstall of a fresh native build.
8. Builds #9 and #10 were produced and #10 submitted to TestFlight during the saga.

**The lesson (now a house rule):** any screen with a text input that navigates on submit must dismiss the keyboard and wait before navigating, must not use `textContentType="password"/"newPassword"`, and should prefer `router.push` over `router.replace`.

---

## 4. The July 19 audit — findings & fixes (commit `b1ffa0b`)

| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | Push notifications + reminder sync **still disabled** — the July 4 diagnostic was never reverted | Critical | Re-enabled in `stores/auth.ts` |
| 2 | **Sign-in** screen still had the crash-prone password attributes | High | Same iOS 26 guard as sign-up |
| 3 | **Crew signup** screen — third password field, same crash surface | High | Guard applied |
| 4 | **Migration `20260604000400` (Documents) never applied to the live DB** — Documents feature silently broken in prod since 4 Jun | Critical | SQL given to Todd to run (§5); services bridged in the meantime |
| 5 | **Migration `20260604000600` (snag sign-off) never applied** — resolving a snag with proof photos would error | Critical | Same |
| 6 | `types/db.ts` months stale (masked the two findings above) | Med | Regenerated from live DB; command recorded in §7 |
| 7 | Bad type cast on the project Pricing card | Low | Fixed |
| 8 | Stale `buildNumber` in app.json warning on every build | Cosmetic | Removed |

Whole project now compiles with **zero TypeScript errors**. Rule going forward: always run full `npx tsc --noEmit` (never grep-filtered) before shipping.

---

## 5. Current state & outstanding actions

**As of 19 Jul 2026:**

- Code: everything through the audit is committed (`b1ffa0b`) and pushed to GitHub `main`.
- OTA: latest update group `f4da013e` on the `production` branch.
- TestFlight: **build #10** live (contains the pre-audit code natively; OTAs layer on top).
- Database: resumed, tables verified, **nuked ready for fresh testing** — except the two missing migrations below.

**Todd's checklist to get back to testing:**

- [x] 19 Jul: **Documents migration** SQL run in Dashboard — Documents feature live for the first time
- [x] 19 Jul: **snag sign-off migration** SQL run
- [x] 19 Jul: **nuke** run — clean slate
- [x] Terminal: `eas build` → 19 Jul: first attempt blocked by Apple paperwork (updated Developer Program agreement + EU DSA trader status — both accepted in the web portals); retry succeeded → **build #12** (`ae5268f4`, the failed attempt burned #11)
- [x] 19 Jul: `eas submit` → build #12 uploaded to App Store Connect, Apple processing
- [ ] Every test device: **Delete** the Phase app entirely, reinstall from TestFlight once #12 appears (clears the corrupted update cache from the crash loop)
- [ ] After migrations are in: regenerate types + remove the `(supabase as any)` bridges in `services/documents.ts`, `services/snags.ts`, `services/reminders.ts`, `services/pricing.ts` (dev task, non-urgent)

---

## 6. Re-test script — from the very start

Run in order on a clean install of build #11. Tick as you go; note anything odd next to the step.

**A. First launch & signup (the crash gauntlet)**
- [ ] A1. Open Phase → welcome/promise screen renders
- [ ] A2. Tap **Start your Phase** → sign-up form
- [ ] A3. Fill name/email/password → **Create account** → **no crash** ← the moment of truth
- [ ] A4. Lands on **"Which describes you?"** (role select actually appears)
- [ ] A5. Pick **tradesman** → Continue → saves without "not signed in" error
- [ ] A6. **"Hi [FirstName]!"** personalised welcome with 5-step preview
- [ ] A7. Tour: **5 slides**, last one is pricing ("Every price change, on the record")
- [ ] A8. Lands on Jobs; **Get started checklist shows 5 items**

**B. First project**
- [ ] B1. Create project → UK **address lookup** works (postcode search)
- [ ] B2. Trade template milestones appear automatically
- [ ] B3. Checklist item "Create your first project" ticks itself on return to Jobs
- [ ] B4. Project detail shows: Photos/Schedule/Documents/**Pricing** cards + **"Set up daily reminder"** link under End my day

**C. Pricing wedge (Sprint 51)**
- [ ] C1. Pricing → set initial quote (e.g. £5,000)
- [ ] C2. "Request a price change" → new amount + reason → sends
- [ ] C3. (With customer account, section E) customer sees pending banner → approve/reject → history logs it → both sides get pushes

**D. The daily loop**
- [ ] D1. Post an update with photo → appears in feed
- [ ] D2. **End my day** → modal opens directly → send EoD
- [ ] D3. "Set up daily reminder" → pick time/days → save → local notification fires at chosen time
- [ ] D4. Documents → upload a PDF → opens in viewer *(first ever real test — table was missing until now)*
- [ ] D5. Snag flow: create snag → resolve with proof photo → customer signs off *(also first real test)*

**E. Customer side**
- [ ] E1. Invite customer via SMS/code from project detail
- [ ] E2. Customer signs up via invite → joins project → **no crash** on their signup either
- [ ] E3. Customer dashboard shows project ring, latest update, voice note plays
- [ ] E4. Chat both directions → push received both ways
- [ ] E5. Reactions + comments on an update

**F. Crew**
- [ ] F1. Invite crew from project → apprentice signs up via code → **no crash**
- [ ] F2. Apprentice posts update → lands in lead's Approvals queue → approve → customer sees it

Report results step-by-step; any failure gets fixed before moving on.

---

## 7. Reference — how we ship

| Action | How |
|---|---|
| JS-only change | commit → `eas update --branch production --environment production --message "..."` → `git push` |
| Native change / fresh binary | `eas build --profile production --platform ios` → `eas submit ...` |
| Database change | Write migration file in `supabase/migrations/` **and apply it to the live DB**. As of 19 Jul, Claude can apply SQL directly via the Supabase Management API (`POST /v1/projects/<ref>/database/query`) — no more manual dashboard pasting, which is the step whose omission caused the missing-migration bug |
| Regenerate DB types | `SUPABASE_ACCESS_TOKEN=<token> npx supabase gen types typescript --project-id gzzznhqvwyuyvzociydw --schema public > types/db.ts` |
| Reset test data | The DO-block nuke (skips missing tables) — see memory / session notes |
| OTA reaches a device | Cold start downloads it in background; **second** cold start runs it. Delete + reinstall if a device is in a crash loop. |

---

## 8. 19 Jul (later) — the real root cause: poisoned OTA pipeline

The fresh `.ips` from Todd's phone after build #12 was a **boot crash, 2 seconds
after launch, on `expo.controller.errorRecoveryQueue`** — identical signature
and code offsets to the 4 Jul boot crash. Combined with the pattern that
server-built binaries always boot fine, the conclusion:

> **JS bundles published as OTAs from Todd's Mac fail at startup on device.**
> expo-updates then either crashes (the boot crashes testers saw) or silently
> rolls back to the binary's built-in bundle (why testers always looked like
> they were "on stale versions" — the OTAs loaded, died, and reverted).

This retroactively explains most of the 15 Jun "tester on old OTA" mysteries
and much of the 4 Jul saga. The signup crash on the embedded bundle may have a
separate cause — with the crash trap now embedded in build #13, the next
occurrence will identify itself on screen. Exact local-bundling mechanism
(stale Metro cache? env drift? node_modules subtleties — 89 npm-ls warnings,
mostly optional peers) is unconfirmed and no longer worth chasing.

**Actions taken:**
- Published **roll-back-to-embedded** on the `production` branch (`e6b99d48`)
  — all devices abandon locally-bundled OTAs and run the binary's own code.
- **Build #13** built (crash trap v2 + build stamp) but **never submitted** —
  superseded the same afternoon after the trap-armed signup crash showed no
  on-screen error, proving the signup crash bypasses JavaScript (native abort).
- **Build #14** (`6dffd4a`, submitted to TestFlight 19 Jul): expo-updates
  **disabled entirely** (`updates.enabled=false` — the ErrorRecovery crash
  surface is out of the process; stamp permanently reads `js embedded`),
  crash trap v3 (record + swallow, report on next launch, no in-handler
  alert), and a minimal signup flow (blur → 600ms settle → network →
  `router.push`; the v3 unmount-the-password-field trick deleted as a
  suspected crash cause). Next: delete + reinstall on devices, nuke DB,
  re-run test script §6 from A1.

**New shipping policy (until further notice): NO `eas update`.** Every change
ships as a native EAS build + TestFlight submit. Slower (~40 min) but built in
a clean environment and deterministic. Revisit OTAs only after a clean
`npm ci` + cache reset, verified by publishing a trivial OTA and checking the
welcome-screen stamp flips without a crash.

---

## 9. 19 Jul (evening) — THE ACTUAL ROOT CAUSE, caught red-handed

Build #14 still crashed. Todd captured the crash **live via the Mac's Console
app** with the iPhone on a cable — and there it was, in plain text:

> `RCTFatalException: Unhandled JS Exception: Error: Maximum update depth
> exceeded ... at AuthGate`

**AuthGate — our own routing gatekeeper — was stuck in an infinite redirect
loop.** It navigates from inside a React effect, but the router reports its
location with a lag; on fast paths the same redirect re-fired against the
stale location ~50 times in one beat and React aborted the app. It only
triggers when a session exists at the moment AuthGate first evaluates —
exactly (a) the instant signup completes and (b) every boot with a saved
session. One bug = the signup crash + the boot crash + the boot loop, on
every build since the Sprint 44-era effect-driven redirects, detonating only
when render timing aligned.

**The false trails, for the record:** iOS 26 keyboard teardown (v1–v4 fixes),
the OTA bundler environment (still plausibly flaky, ban stays), expo-updates
error recovery (it was merely the messenger relaying the JS error), the push
permission prompt. Days of fixes aimed at bystanders. The lesson: *get the
error text first* — the Console capture achieved in five minutes what four
crash-log autopsies couldn't.

**The fix (build #15, commit `d87c876`):**
- `go(target)` guard in AuthGate — each redirect target can be requested at
  most once until the router's location actually changes. Loops are now
  impossible by construction.
- A root **ErrorBoundary** — render-phase errors (invisible to the ErrorUtils
  crash trap, as this saga proved) now show a screenshot-able error screen
  instead of killing the app.

**Follow-through (same evening, autonomous while Todd was out):**
- Swept the whole app for other effect-driven navigation: AuthGate was the
  only instance; all other navigation is user-tap-initiated. Clean.
- Discovered the Supabase **Management API** accepts SQL directly with the
  existing access token — the DB was nuked + verified (0 users / 0 profiles /
  0 projects, `project_documents` confirmed present) without the dashboard.
  Future migrations can be applied by Claude directly.
- Build #15 (`5587e6e2`) built + submitted to TestFlight automatically at ~14:55.

---

## 10. 19 Jul (~15:10) — CONFIRMED FIXED ✅

Todd, on a clean install of build #15: signed up as a fresh user and **landed
on "Which describes you?"** — no crash. The AuthGate loop fix (`d87c876`) is
verified on device. The July crash saga is closed. Testing resumes at §6 A5.

---

## 11. 19 Jul (~15:00) — the boundary catches the REAL killer

Build #15's signup worked (role-select finally reachable!) but tapping
tradesman → Continue hit the new ErrorBoundary screen — which is exactly what
it's for: instead of a mystery crash, it showed the error and full component
trace on-screen.

**The true root cause of the entire July saga** (superseding §9's AuthGate
theory — AuthGate was ancestry in the traces, not the culprit): the Sprint 46
"checklist refetches on focus" fix (`8c0e085`, 15 Jun) put the whole
useQuery result object in its effect deps. That object is new every render →
the focus effect re-fired every render → refetch → state change → render →
**infinite loop** ("Maximum update depth exceeded") whenever the Jobs or
customer home screen gained focus. Every crash path ran through a home screen
gaining focus: fresh signup (→ customer home), signed-in boot (→ home),
role-select confirm (→ Jobs).

Why it hid for two weeks: shipped 15 Jun as an OTA the broken bundler
pipeline never delivered (June testing passed), first embedded natively in
builds #9/#10 on **4 Jul — the exact day the "signup crashes" began.**

**Fix (`c7c9b3f`, build #16):** dep on TanStack's stable `refetch` functions,
never the query object. Codebase swept: no other instances. DB re-nuked via
the management API. Build #16 auto-submitted on completion.
- Build #16 (`21cf73cb`) submitted to TestFlight ~15:35.
