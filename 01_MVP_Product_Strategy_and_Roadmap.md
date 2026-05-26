# Tradesmen Uber — MVP Product Strategy & Roadmap

**Deliverable 1 of 4** · UK market · Solo founder, fastest MVP context
*Companion docs: 02 Technical Architecture · 03 Design System & Screen Specs · 04 Interactive Prototype*

---

## 1. The one-liner

**A live project workspace shared between the tradesman, their crew, and the customer.**

For UK homeowners spending £5k–£100k+ on building work, and for the tradesmen and apprentices they hire. Customers get Uber-style visibility into their project. Tradesmen get a professional veneer over their existing chaos. Crews stay coordinated without group chats.

Internal positioning: *"Customer confidence infrastructure for trades."* It is not a directory. It is not a marketplace. It is anxiety-reduction software with a project tracker bolted on — and the only way a customer ever enters the app is by being invited into a specific project.

> **One-line bumper:** *"We'll never leave you wondering."* Every product decision answers to this.

---

## 2. The core insight (do not forget this)

> **Customers do not fear delays. They fear silence.**

A roofer who texts "weather delay, back Wednesday 8am" keeps the customer happy. The same roofer who goes quiet for 48 hours is a 1-star review and a chargeback, regardless of whether the work is good.

The product wins by making the **act of updating** so frictionless that even disorganised tradesmen do it. Every product decision flows from this. If a feature doesn't either (a) make updates easier for the tradesman or (b) make the customer feel held, cut it.

---

## 3. Who we're building for (UK)

### Primary tradesman persona — "Dave the builder"
- 35–55 years old, runs a 1–4 person operation
- 2–6 active jobs at any time, mix of residential refurbs and extensions
- Communication style: WhatsApp + phone calls, never email
- Pain: gets 6–12 customer "checking in" messages per day across 5 jobs; loses an hour daily to repeating himself
- Cares about: looking professional, getting paid on time, repeat referrals
- Will pay for: anything that reduces inbound calls without adding admin work

### Primary customer persona — "Sarah the homeowner"
- 32–55 years old, mid–upper income, spending £15k–£80k on a refurb/extension
- First or second major project, anxious, has read horror stories
- Spouse asking her daily "what's happening with the kitchen?"
- Pain: doesn't know what's happening, feels rude chasing, fears being taken advantage of
- Cares about: knowing where things stand, feeling respected, predictability
- Will not pay (free for customers — funded by tradesmen)

### Tertiary persona — "Jamie the apprentice"
- 18–24 years old, working under Dave or another lead tradesman
- On site daily, often the first to arrive and last to leave
- Communication style: WhatsApp + voice notes, very visual
- Pain: getting blamed for things they didn't do; no easy way to log what they did today; supervisor not always reachable
- Cares about: looking competent, hours logged correctly, learning the trade
- Tracked while on shift (with consent) for payroll proof, safety, and supervisor visibility

### Who we're NOT building for in MVP
- Large commercial contractors with PMs (overserved)
- Sole-trader call-out work under £500 (no project to track)
- Subcontractor coordination (V2+)
- **Customers shopping for a tradesman** — we are not a directory. Customer entry is invite-only, forever. If a customer needs to "find" a tradesman, the answer is *via someone who already uses the app*, not via a search bar.

---

## 4. Competitive landscape (UK)

| Player | What they are | Why they don't solve this |
|---|---|---|
| **Checkatrade / MyBuilder / Rated People** | Lead-gen directories | Stop at the booking; no in-job experience |
| **Houzz Pro** | US-centric SaaS for designers | Too heavy, not UK trades, not consumer-facing |
| **Powered Now / Tradify / Fergus** | Tradesman admin software | Built for the tradesman only. Customer never logs in. |
| **WhatsApp** | The actual incumbent | Chaotic, unstructured, no project state, no payment, no trust layer |

**The wedge:** Every existing solution serves *one side* — either the customer (directories) or the tradesman (admin software). Nobody owns the live shared experience between them. That's the gap.

**The bet on invite-only:** Choosing to NOT compete with Checkatrade et al. on discovery is a deliberate strategic constraint, not a missing feature. It keeps the relationship between tradesman and customer pre-existing (a trust foundation we don't have to manufacture), and it forces the product to win on the in-job experience — which is where every directory drops the customer.

---

## 5. MVP scope — ruthlessly cut

Solo founder. 12 weeks to TestFlight. The job is to launch something narrow that 20 tradesmen love, not something broad that 200 tolerate.

### IN — MVP (V0)

**Authentication & onboarding**
- Email + Apple Sign In + Google Sign In
- Phone verification (SMS) for tradesmen and apprentices
- Role chosen at signup (tradesman / apprentice / customer)
- Tradesman: 4-screen onboarding (name, trade, business, photo) + location consent screen
- Apprentice: 3-screen onboarding (name, photo, employer code from lead tradesman) + location consent screen
- Customer: invited *into* a project by the tradesman + light location consent (home address geofence only)
- **No public customer signup. Ever.** Customer can only enter via tradesman invite.

**Projects**
- Tradesman creates a project, enters customer name + phone, customer gets SMS invite
- Project has: title, address, start date, expected end date, status, milestones, updates feed
- One tradesman, one customer per project (no teams, no multi-customer)

**Status system (8 states, fixed taxonomy)**
- Quote sent · Scheduled · Materials ordered · In progress · Delayed · Awaiting approval · Awaiting inspection · Completed
- Each state has reassurance copy auto-shown to customer

**Live timeline feed**
- Tradesman posts updates: text + up to 6 photos (no video in MVP — see "Cut" below)
- Voice note → transcribed to text (uses OS speech-to-text, free)
- Customer sees feed in reverse chronological order
- Customer can react (👍 / ❓ / ❤️) and comment

**Milestones (preset templates by trade)**
- Tradesman picks trade type at project creation → milestone template pre-populated
- E.g. Kitchen fit: Strip out → 1st fix plumbing → 1st fix electrical → Plaster → Units in → Worktops → 2nd fix → Snag
- Tradesman ticks them off; customer sees progress ring

**Direct messaging**
- 1:1 chat per project (not separate from project — embedded in project tab)
- Text, photos, voice notes, read receipts
- Push notifications

**Location tracking & site geofences (the trust signal layer)**
- All three personas have a per-persona consent screen before any location use. Toggle-able from settings forever after.
- iOS **`WhenInUse` permission only** + **geofencing API** (no continuous background GPS, no map view). Battery-safe, App Store-safe, GDPR-defensible.
- Each project has a **site geofence** (anchored to the project address, 80m radius, set by the tradesman during project creation).
- Each customer has a **home geofence** (their own address, set during invite acceptance).
- Two events power the entire feature:
  - `arrived_at_site` — fires when a tradesman or apprentice enters a project geofence during expected working hours
  - `left_site` — fires when they leave it (with a 90-second debounce to ignore tool runs)
- Customer sees these as soft event pills in the Updates feed: *"Dave arrived 8:14am"* / *"Dave left site 4:32pm."* No maps, no tracking dot.
- Apprentice tracking is scoped to assigned project sites only, only during clock-in to clock-out — visible to their lead tradesman, never to the customer.
- Tradesman keeps the old manual *"On my way"* tap as a fallback (battery, signal, or the geofence misses).

**Leave-site update nudge (the highest-leverage feature in the MVP)**
- `left_site` event triggers a push to the tradesman 90 seconds after leaving: *"Heading home? Sarah's waiting on an update. 20 seconds."*
- Tap → opens a pre-filled **End-of-Day card** in the compose sheet:
  - Today's status pill (auto-suggested from milestone state)
  - Optional photo, optional voice note
  - ETA tomorrow (auto-populated from project schedule)
  - Default body text auto-fills: *"Wrapped up for today. Back tomorrow ~8am."*
- One tap to send. Goal: under 20 seconds from notification to sent update.
- Apprentices get the same nudge, but their update goes to the lead tradesman for approval, not directly to the customer.
- This is *the* operationalisation of the core insight (silence kills, not delays). It removes the only barrier to updating: remembering.

**Notifications & the Updates surface**
- The customer's third tab is **Updates** — a single feed of: project updates, status changes, arrival/left events, milestones, payment events. Push notifications mirror this feed.
- Tradesman gets a parallel **Updates** surface scoped to all their projects + crew activity.
- Apprentice's Updates is scoped to today's site + crew messages from the lead.
- Tone: calm and specific. "Dave completed *Plastering*. Photo attached." Not "You have a new notification."
- Customer never gets a notification when nothing has happened. Silence on the platform = silence in the notifications tab. No fake engagement.

**Tab bar by persona (locked in MVP)**
| Persona | Tab bar |
|---|---|
| **Customer** | Project · Messages · Updates · Account |
| **Tradesman (lead)** | Jobs · Crew · Messages · Account |
| **Apprentice** | Today · Crew · Messages · Account |

No search icon, anywhere, ever.

**Quotes & invoices (light)**
- Tradesman uploads a PDF quote or types line items → customer sees, approves
- Deposit + final invoice via Stripe (Apple Pay supported)
- No multi-stage milestone payments in MVP (V1)

**Trust signals (lightweight)**
- Tradesman profile shows: photo, business name, trade, years trading, verified phone, completed projects on platform
- After project completion, customer prompted for star rating + one-line review
- No external verification (Gas Safe API, insurance) until V1

### CUT — explicitly deferred (with reasoning)

| Cut | Why | When |
|---|---|---|
| **Continuous live GPS tracking with a map view** | "Surveillance" optics, battery drain, App Store risk. Geofence events give us the trust signal without the creep. | V2 (and even then, only an ETA on travel day — never a constant dot) |
| **Video uploads** | Storage cost, encoding complexity, edit friction. Photos cover 95% of cases. | V1 |
| **Team management / multiple tradesmen per job** | Forces complex permissioning. Most MVP customers are sole/small. | V1 |
| **Subcontractor coordination** | Network effects problem; can't solve until base is large. | V2 |
| **Multi-stage milestone payments** | Stripe Connect setup + dispute logic = 3 weeks alone. Use deposit + final for MVP. | V1 |
| **AI summaries / sentiment / FAQ** | Cool but not the wedge. Ship the boring thing first. | V2 |
| **Materials ordering / supplier integrations** | Out of scope; we're a comms layer not a marketplace. | V3 or never |
| **AR previews, smart home, wearables** | Founder fantasy. Delete from the brief. | Never (or V4) |
| **Web app for customers** | iOS-only is fine; customers will install. Web is V1 if mobile traction. | V1 |
| **Android** | Validate on iOS first. UK tradesmen skew iOS in target demographic. | V1 |
| **Public customer signup / customer-initiated projects / customer search** | Permanent product position, not a backlog item. We are not a directory. Cross-trade introductions happen via tradesman-initiated *referral handoff* (V2). | **Never** — this is the wedge |
| **Admin dashboard** | Solo founder = direct DB access via Supabase. Build admin when you have a support person. | V1 |
| **In-app insurance / licence verification (Gas Safe, NICEIC, CSCS)** | High value but slow. Self-declared in MVP; verified badges in V1. | V1 |
| **Disputes & moderation tooling** | Handle 1:1 via email until you have >50 active projects. | V1 |
| **Subcontractor / team chat** | Out of scope. | V2 |

### V1 (post-MVP, weeks 13–24)
Verified badges (Gas Safe API, insurance upload + manual review), milestone-stage payments via Stripe Connect, video uploads, web customer view, paid tradesman subscription kicks in, **crew shift logs** (apprentice clock-in/out powered by the existing geofence), AI-cleaned voice notes.

### V2 (months 6–12)
- **Travel-day ETA** — live ETA appears in the customer's Project tab only on the day the tradesman is travelling to site. Disappears the moment they arrive. The "Uber moment," with deliberate scope limits to avoid surveillance optics.
- **Tradesman-initiated referral handoff** — Dave can introduce Sarah to Mike the electrician with one tap, keeping the relationship inside the platform without ever exposing a search bar to customers.
- **Multi-trade projects** — customer-managed extensions with builder + electrician + plumber all posting into the same project workspace.
- AI update polish, customer sentiment alerts for tradesmen, referrals flywheel for tradesmen acquiring tradesmen.

### V3+ (year 2)
Materials ordering, financing for customers, white-label for franchise trades, multi-region.

### Permanently OUT
Customer-facing search, public tradesman directory, lead-gen marketplace economics. These are the businesses we're explicitly not.

---

## 6. The critical user flows

### Flow A — Tradesman invites customer to a new project
1. Tradesman opens app → "+ New project"
2. Picks trade type (Kitchen / Bathroom / Extension / Roofing / Electrical / Plumbing / Decorating / Landscaping / Other)
3. Enters: customer name, customer mobile, project title, address, expected start, expected duration
4. Picks milestone template (pre-filled for trade type, fully editable)
5. App sends SMS: *"Hi [Sarah], Dave at Smith Builders has set up your kitchen project on Tradesmen [app name]. See live updates here: [deeplink]"*
6. Customer taps link → install + opens straight into project (deferred deep link)

**Why this matters:** Zero-friction customer onboarding. Customer never types anything to join. This is the #1 conversion lever.

### Flow B — Tradesman posts a daily update (the core habit loop)
1. Bottom tab "+ Update" — opens directly to camera
2. Snap 1–4 photos
3. Optional: tap mic, speak 10 seconds ("Finished plastering the back wall, drying tomorrow, painters in Thursday")
4. Speech transcribes to text, editable
5. Tap milestone tag (optional) — auto-progresses milestone if "Complete"
6. Tap Post — customer gets push within 3 seconds

**Target:** Under 30 seconds from tap to post. Anything slower and Dave goes back to WhatsApp.

### Flow C — Customer opens the app (the anxiety-reduction loop)
1. Push notification → tap → lands on project
2. **Above the fold, no scrolling needed:**
   - Status badge (e.g. "On track — Day 3 of 12")
   - Latest update card (photo + 1-line text + timestamp)
   - Today's expected activity (from milestone)
   - Next milestone + date
3. Below: full timeline feed, chat, milestones, invoice tabs

**Target:** Customer gets reassurance in under 4 seconds of opening the app. No "loading", no decision-making.

### Flow D — Status change (the proactive reassurance flow)
1. Tradesman changes status to "Delayed"
2. App prompts: "What's the reason? (Customer will see this)"
3. Tradesman picks: Weather · Materials · Other trade · Customer change · Other → optional voice note
4. App auto-composes: *"Project is delayed due to [materials]. Dave's expected back on site [Mon 18th]. Your kitchen remains on track for completion by [original date + buffer]."*
5. Tradesman approves → customer gets push

**Why this matters:** A "Delayed" status that says *only* "Delayed" creates more anxiety than no update at all. The reason + the reassurance are non-negotiable.

### Flow E — Quote → deposit → completion (the money loop)
1. Tradesman uploads quote (PDF or line-items)
2. Customer reviews, taps Approve
3. Optional deposit → Apple Pay → funds in tradesman's Stripe account (T+2)
4. Project starts
5. On completion → final invoice → Apple Pay → tradesman paid
6. Customer prompted for review

### Flow F — Leave-site nudge (the silence-killer)
1. Tradesman/apprentice crosses the project's geofence boundary on the way out
2. 90-second debounce — they're actually leaving, not grabbing a tool from the van
3. Geofence service fires `left_site` event → push to the tradesman: *"Heading home? Sarah's waiting on an update. 20 seconds."*
4. Tap → opens **End-of-Day card** with status pill auto-suggested, default body pre-filled, photo + voice optional, ETA tomorrow pre-populated
5. One tap to send → customer receives a structured update card in their Updates tab (not just a chat line)
6. If dismissed without sending → quieter follow-up nudge at 8pm: *"Quick photo? Sarah hasn't heard from you today."*
7. Apprentice variant: card goes to lead tradesman for approval before the customer sees it (trains the habit, controls brand)

**Why this matters:** This single flow does more for the core insight than any other feature. Tradesmen don't fail to update because they don't care — they fail because by the time they remember, they're in the van or back home and the moment is gone. We catch that moment.

### Flow G — Apprentice on shift (the crew loop)
1. Apprentice opens app at start of day → sees their assigned site + today's tasks (set by lead tradesman)
2. Geofence auto-clocks them in when they arrive — visible to the lead, never to the customer
3. Throughout the day: apprentice can post mini-updates to the lead (not the customer): *"Plasterboard delivery arrived, stacked in hall."*
4. Lead tradesman sees a single Crew tab with all apprentices' live locations (on shift only) + their mini-updates
5. End of day: leave-site nudge fires for apprentice too, but lighter-touch — *"Anything to flag for Dave before tomorrow?"*

---

## 7. Tech stack recommendation (solo founder bias)

| Layer | Pick | Why |
|---|---|---|
| **App** | **Expo (React Native) + TypeScript** | One codebase, faster iteration, hire-able. SwiftUI would be more "premium" but doubles dev time + locks out web later. With careful design + haptics, Expo can feel native enough. |
| **State** | Zustand + React Query | Lightweight. Redux is overkill for MVP. |
| **Backend** | **Supabase** (Postgres + Auth + Realtime + Storage + Edge Functions) | Solo founder cannot build this. Supabase gives you 80% of the backend in week 1. Postgres RLS handles permissioning cleanly. |
| **Auth** | Supabase Auth (email + Apple + Google) + Twilio Verify (SMS) | Twilio for UK SMS (Supabase phone auth uses Twilio under the hood anyway). |
| **Realtime** | Supabase Realtime (Postgres CDC) | Free up to 2M messages/month. Sufficient until 1k DAUs. |
| **Storage** | Supabase Storage (photos), with Cloudflare R2 if costs balloon | S3-compatible, cheap. |
| **Push** | Expo Push Notifications | Free. Works for both iOS and Android (when we add it). |
| **Payments** | Stripe + Apple Pay | UK SCA-compliant out of the box. Stripe Connect (Express) for tradesmen receiving funds. |
| **Maps** | None in MVP (Apple Maps only via deeplink for address) | No live map view; geofence events come from CoreLocation, not from a map UI. |
| **Location / geofencing** | **`expo-location`** (CoreLocation under the hood) + Supabase Edge Function to write `location_events` | `WhenInUse` permission only. Geofence registration is local on-device; events fire even when app is backgrounded. No continuous GPS. Compliant with App Store privacy & GDPR. |
| **Analytics** | PostHog (self-host or cloud, free tier) | Product analytics + feature flags + session replay in one. |
| **Error tracking** | Sentry | Cheap, essential. |
| **Email** | Resend | Cheap, dev-friendly. |

**Founder time budget:** ~12 weeks to TestFlight if you're full-time, ~20 weeks at 20h/week.

**Where the time goes (rough):**
- Weeks 1–2: Supabase schema + auth + role-based RLS
- Weeks 3–4: Project create + invite SMS + customer deep-link onboarding
- Weeks 5–6: Timeline feed + photo uploads + milestones
- Weeks 7–8: Chat + push notifications
- Weeks 9–10: Quotes + Stripe + invoices
- Week 11: Polish, empty states, error states, transitions, haptics
- Week 12: TestFlight, beta with 5 tradesmen + 15 customers

---

## 8. Monetization — what to charge for, when

### MVP launch (weeks 12–24): **Free for everyone**
- Both sides free. Goal is retention, not revenue.
- Stripe payment processing: standard fee passed to tradesman (no markup yet).
- Caveat: this is a 6-month cap, not indefinite.

### V1 (~month 7): Tradesman subscription kicks in
- **Free tier:** 1 active project at a time, basic features
- **Pro — £29/month or £290/year:** unlimited projects, verified badge, custom branding on customer-facing screens (logo on profile/invoices), priority support
- **Team — £79/month:** Pro features + up to 5 tradesmen, shared customer base (V2 feature, prices set early)

### Take rate (later, optional)
- 1% on payments processed (on top of Stripe's fee), waived on Pro plan
- Or: keep payments fully free as a sticky retention feature; don't get greedy

### Why this works
- Tradesmen pay because reduced inbound calls + professionalism = clear ROI on £29
- Free customer-side = no acquisition cost on the demand side; tradesmen bring them in
- Avoid lead-gen / Checkatrade model — that creates an adversarial relationship and we want tradesmen to *love* us

### Unit economics (illustrative, validate post-MVP)
- Target tradesman LTV at 18-month payback: £29 × 18 = £522
- Acceptable CAC: £100–£150
- Acquisition: direct outreach + referrals from existing tradesmen (most efficient channel for trade audiences)

---

## 9. Key risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Tradesmen won't change habits from WhatsApp** | High | Make updating *faster* than WhatsApp (camera-first, voice-to-text). Don't ask them to type. Onboard one tradesman at a time, in person, until friction is zero. |
| **Customers install but disengage after week 1** | High | Push-notification-driven re-engagement. Smart digest if no update in 3 days: "Dave hasn't posted for 3 days. Tap to nudge." (Frames absence as actionable, reduces anxiety from silence.) |
| **Cold-start: tradesman has no customers on platform yet** | Medium | First project is the magic: tradesman invites customer, customer is wowed, tradesman uses it for all jobs. Don't try two-sided cold start — start with tradesman, customer is brought along. |
| **Quality issues: bad tradesman gives platform bad reputation** | Medium | MVP: every tradesman onboarded by founder, manually vetted. Verified badges land in V1. Public reviews from V0. |
| **Stripe Connect / SCA / UK compliance** | Medium | Stripe handles 90% but allow 2 weeks for Connect onboarding flows. Don't underestimate this. |
| **Solo founder burnout / 12-week plan slips** | High | Cut more, not less. If week 8 looks bad, drop quotes/invoices entirely (do via PDF + manual) and ship project + timeline + chat only. The wedge is the timeline; everything else is V1. |
| **iOS-only excludes Android tradesmen** | Low–Med | Acceptable in MVP. ~55% of UK target demo on iOS. Validate first, build Android in V1 if traction. |
| **Customer disputes / refund requests** | Medium | Terms of service make tradesman responsible for delivery. Stripe Connect handles payment disputes. Build dispute flow in V1, handle case-by-case in MVP. |
| **Location tracking creates "surveillance" perception** | High | Use `WhenInUse` + geofence only (no continuous GPS). Show explicit consent screens. Customer never sees a live map. Apprentices can toggle. Lead with the *trust* framing, not the *tracking* framing. Audit-trail every location event. |
| **Apprentice consent under UK employment law (ICO guidance)** | Medium | Apprentice must opt in (cannot be employer-mandated invisibly). Show clearly what data the lead tradesman can see and what they can't. Provide an "off shift" toggle. Document the legal basis (legitimate interest with safeguards). |
| **Geofence false positives (apprentice "left" when they popped to the van)** | Low–Med | 90-second debounce on `left_site` event. 80m default radius (tunable). Always pair the nudge with a "Not leaving? Dismiss" option. |

---

## 10. Success metrics (what to measure)

### North star
**Active projects with a customer-side login in the last 14 days.**
Not signups, not downloads. This single metric captures whether the loop is working.

### MVP success thresholds (3 months post-launch)
| Metric | Target | Why |
|---|---|---|
| Tradesman D30 retention | >60% | If they don't come back in month 2, the product isn't sticky enough |
| Customer D14 retention | >50% | Customer should still be checking in two weeks in |
| Updates per active project per week | >3 | The core habit loop. Below this, customer anxiety creeps back |
| Customer NPS at project completion | >50 | The product promise is emotional; NPS is the cleanest emotional proxy |
| % of tradesmen who do >1 project on the platform | >40% | Determines whether retention is real or curiosity |
| Time-to-first-update from project creation | <24h | If they don't update in day 1, they probably never will |

### Anti-metrics (do not optimise for)
- Total signups (vanity)
- DAU (customers should NOT be daily — that means they're anxious)
- Session length (shorter is better — they should leave reassured)

---

## 11. 12-week MVP build plan (solo founder, full-time)

| Wk | Focus | Outcome |
|---|---|---|
| 1 | Supabase project, schema v1, RLS policies (incl. `site_geofences`, `location_events`, `consent_records`) | DB lives, dev can connect |
| 2 | Auth flows (email, Apple, Google), 3-role selection (tradesman / apprentice / customer) | Login works end-to-end |
| 3 | Tradesman onboarding, profile, project create (incl. site geofence anchor) | Tradesman can create a project with a geofence |
| 4 | Customer SMS invite + deep-link onboarding + home geofence consent | Customer can join a project from SMS |
| 5 | Timeline feed UI, photo upload, post update, Updates surface | Posting an update works; Updates tab live |
| 6 | Milestone system + templates + status taxonomy | Milestones + statuses render correctly |
| 7 | Location consent screens + `expo-location` integration + geofence registration | Arrival/left events fire & log to DB |
| 8 | Leave-site nudge: trigger → push → End-of-Day card → send | Highest-leverage flow works end-to-end |
| 9 | Chat (text + voice notes + read receipts) + push notifications for all triggers | 1:1 messaging + reliable push |
| 10 | Quote upload + approval + Stripe Connect + invoices | Tradesman can request deposit, get paid |
| 11 | Apprentice flow (employer-code onboarding, scoped Crew tab, lead-approved updates) | Apprentices work end-to-end |
| 12 | Polish (empty/loading/error/dark mode/haptics) + TestFlight with 5 tradesmen + 15 customers + 2 apprentices | Live beta |

**Hard rules in priority order:**
1. If week 8 slips, ship the leave-site nudge without the polish — it's the wedge.
2. If week 10 slips, drop Stripe entirely. Project + timeline + chat + nudge is enough.
3. If week 11 slips, ship without the apprentice role. The tradesman/customer loop alone validates the thesis.

---

## 12. Go-to-market — first 100 tradesmen

This is a hands-on, founder-led, non-scalable phase. Do not try to be clever.

### Phase 1 (weeks 13–16): The 10 design partners
- 10 tradesmen onboarded **in person**, one at a time
- Pick across trades: 3 builders, 2 electricians, 2 plumbers, 1 kitchen fitter, 1 bathroom fitter, 1 landscaper
- All within a 30-mile radius (you visit them, fix bugs same-day)
- Every customer invited becomes a feedback channel
- Goal: get to "the tradesman would be sad to lose this" — Sean Ellis test

### Phase 2 (weeks 17–24): 100 tradesmen
- Channels (in priority order):
  1. **Referrals from design partners** (highest signal, lowest cost) — give them a £100 Amazon voucher per referred tradesman who completes 1 project
  2. **Trade Facebook groups** (e.g. *UK Builders*, *Electricians Forum UK*) — founder personally engages, no spam
  3. **Targeted Meta ads** to "self-employed" + "tradesman" interest segments — only after Phase 1 messaging validates
  4. **Trade counters** at Screwfix / Toolstation / Howdens — flyers + QR codes on the counter (cheap, high-intent location)
- Customer side: zero acquisition cost — they come from tradesmen
- Goal: 100 paying-attention tradesmen, 300 active projects, 1,000 customer accounts

### Phase 3 (months 7–12): Scale
- Launch paid plans (Pro tier)
- Affiliate program with trade-adjacent SaaS (accounting software, insurance providers)
- Content / SEO: "How to deal with a delayed builder" type guides (anxiety-led, ranks well, organic)
- Possibly: partnership with a trade association (FMB, NICEIC) for credibility

---

## 13. What I'd be most worried about (founder honesty)

If I were you, the three things that would keep me up at night:

1. **Behaviour change is the hardest sell.** Tradesmen have done WhatsApp for 10 years. They are not begging for an app. You will be told "I don't have time for this" 50 times in your first month. The product must be measurably faster than WhatsApp at the *moment of update*, or it dies. Spend disproportionate time on the update flow.

2. **The first 10 customers carry the whole reputation.** One bad story on Mumsnet ("This app made everything worse") and you're done before you start. Vet tradesmen ruthlessly in MVP. Don't let scale chase quality.

3. **You will be tempted to add features in week 6.** Don't. Every feature you cut is a week saved. The brief lists ~30 features. Ship 8. Ship them brilliantly. Add the rest in V1 after you've earned the right.

---

## 14. The brand promise (use this in every comms decision)

> **"We'll never leave you wondering."**

When writing copy, designing screens, choosing notifications, picking colour — ask: *does this make the customer feel less alone in their project?* If yes, do it. If no, cut it.

The product is not a project tracker. It's a quiet, confident voice in the customer's pocket saying "everything is fine, here's what's happening, here's what's next." That's the whole product.

---

## 15. Note on the V2 marketplace doc (05)

Deliverable 05 was drafted before this strategy hardened around invite-only. **The customer-led discovery / search portions of 05 are now retired.** What survives from that doc:

- **Tradesman tier & badge system** — still valuable as internal quality signals and as light badges on the *invited customer's* tradesman profile page. Earned, not bought.
- **Referral handoff (tradesman → tradesman)** — V2 mechanism for cross-trade introductions without customer search.
- **Crew Hub** — now in MVP (apprentice flow + Crew tab), not V2.

Doc 05 should be re-read with the understanding that any "customer searches for a tradesman" flow is dead. If we want to add it later, we will have to revisit this strategic position with eyes open.

---

*Next deliverable: 02 — Technical Architecture & Database Schema. Will reference the entities, statuses, milestones, flows, and the location + nudge layer defined here.*
