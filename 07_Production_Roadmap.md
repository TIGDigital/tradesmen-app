# Tradesmen Uber — Roadmap to Production

**Deliverable 7 of 7** · From clickable prototype to paying customers
*References 01 Strategy · 02 Architecture · 03 Design System · 04 Prototype · 05 V2 Vision · 06 Crew Hub*

---

## 1. Honest assessment: where we actually are

### What's done (impressively)
- A clickable iOS prototype with 50+ screens covering customer, tradesman, and apprentice flows
- A complete design system: tokens, components, typography, motion, copy rules
- An MVP product strategy with a clear wedge ("customer trust infrastructure for trades")
- A technical architecture with Postgres schema, RLS policies, realtime model, and stack picks
- A V2 marketplace + gamification vision
- A Crew Hub feature design that extends the platform to lead-and-crew coordination

### What's actually built in code
- Nothing. Zero lines.

This is the right place to be. The point of the prototype was to de-risk decisions before writing any code, and that's worked. Now the job is to execute, narrowly and fast.

### What this roadmap is, and isn't
This is **not** a Gantt chart. It's a sequenced plan with:
- Explicit phases and what shipping each one means
- Non-code workstreams running in parallel (legal, marketing, ops)
- Hiring gates and money gates
- A risks list ranked by what kills the company
- The first 3 actions for this week

---

## 2. The shape of the journey

| Phase | Weeks | Outcome |
|---|---|---|
| **Phase 0 — Pre-flight** | -2 to 0 | Validation, legal, brand, tooling set up |
| **Phase 1 — Foundation** | 1–3 | Supabase + auth (incl. apprentice role) + design tokens in code, scaffold |
| **Phase 2 — The wedge** | 4–7 | Tradesman creates project (with site geofence), customer joins via SMS (with home anchor), timeline + Updates feed live |
| **Phase 3 — Location + nudge** | 8–9 | `expo-location` integration, geofence events, leave-site nudge + End-of-Day card. The highest-leverage flow. |
| **Phase 4 — Money + chat** | 10–11 | Apple Pay deposits + 1:1 chat working end-to-end |
| **Phase 5 — Apprentice + polish** | 12 | Apprentice role end-to-end (employer-code onboarding, scoped Crew tab, lead-approved updates), polish, dark mode, copy review |
| **Phase 6 — Private beta** | 13 | TestFlight live with 5 tradesmen + 15 customers + 2 apprentices, daily founder support |
| **Phase 7 — Public TestFlight** | 14–16 | Bug fixes, App Store metadata + Privacy Manifest (location declaration), App Review submitted |
| **Phase 8 — Soft launch** | 17–19 | First 100 tradesmen onboarded manually in 1–2 UK regions |
| **Phase 9 — V1 features** | 20–32 | Verified badges, milestone-stage payments, AI-cleaned voice notes, crew shift logs |
| **Phase 10 — V2 features** | Months 7–12 | Travel-day ETA (deliberately narrow), tradesman-initiated referral handoff, multi-trade projects, tier/badge system surfaced. **No customer-facing search, ever.** |

**From "start coding" to "first paying tradesman": ~22 weeks if full-time, ~34 weeks at 20h/week.** (Slight slip vs original plan — Phase 3 is the leave-site nudge, which moved earlier because it's the wedge.)

Per the strategy doc, hard rules in priority order:
1. If Phase 3 slips, ship the nudge unpolished — it's the wedge.
2. If Phase 4 slips, drop Stripe. Project + timeline + chat + nudge is enough.
3. If Phase 5 slips, ship without the apprentice role.

---

## 3. Phase 0 — Pre-flight (before any code)

These cannot be done while building. Most are 1–2 day tasks individually but the sequencing matters.

### 3.1 Validation interviews — non-negotiable
- 10–15 in-person interviews with target tradesmen in your area
- Show them the prototype on your phone
- Ask: "Would you actually use this? What would stop you?"
- Find your 5 design partners here — the ones who say yes and mean it

**Cut feature ideas that get a lukewarm reception from 8 out of 10 tradesmen.** Don't over-listen — they'll tell you they want admin features they won't actually use. Listen for emotional reactions to the timeline + update flow specifically.

### 3.2 Legal setup
- Form UK Ltd company (Companies House, ~£12 + accountant)
- Sole director + 100% shareholder for now (founder)
- VAT registration: not required until £85k revenue — defer
- Business bank account (Tide, Mettle, or Starling — fastest for sole directors)
- Terms of Service draft (use Cooley GO or a template, ~£0–£500 for a one-pass solicitor review)
- Privacy Policy (GDPR-compliant, mentions Stripe/Supabase/Twilio as processors)
- Data Processing Agreements signed with: Supabase, Stripe, Twilio, Resend, Sentry
- App Store developer account (£79/year)

### 3.3 Brand identity (lightweight)
- Logo (a single "T" mark on brand blue — your prototype already has it)
- App icon (final 1024×1024 + iOS sizes — commission from Fiverr/Dribbble, £200)
- Marketing landing page (single-page, lists features + waitlist signup, on Webflow/Framer, £15/mo)
- Domain — tradesmenapp.uk is in the prototype; secure it + .co.uk fallback

### 3.4 Tooling accounts
- GitHub (private repo, free)
- Supabase (Pro plan once you have data, £20/mo)
- Expo (free → EAS Build £29/mo when ready)
- Stripe (Connect Standard, free until transactions)
- Twilio (~£5/mo for UK SMS sandbox + pay-per-message after)
- PostHog (free up to 1M events)
- Sentry (free up to 5k errors)
- Resend (free up to 3k emails/mo)
- Apple Developer (£79/yr — must be in your real name initially, transferable later)

### 3.5 Pre-flight design tasks
- Extract the prototype's design tokens into a TypeScript file (`theme/tokens.ts`)
- Map each component in `03_Design_System.md` to its planned file path
- App icon final design + all iOS sizes
- App Store screenshot designs (you'll need these before submission — start now)

**End of Phase 0:** you can write `npx create-expo-app` and your design tokens already compile.

---

## 4. Phase 1 — Foundation (Weeks 1–3)

This is where most solo founders waste a month. The trick: get a skeleton that lets every later week be about *features*, not *plumbing*.

### Week 1 — Supabase + RLS
- Initialise Supabase project (eu-west-2 region for UK)
- Implement schema from doc 02
- Write RLS policies for every table — don't skip, can't retrofit safely
- Seed dev data (1 tradesman, 1 customer, 1 project)
- Sentry connected to Supabase Edge Functions

### Week 2 — Auth + role selection
- Apple Sign In (the primary CTA per spec)
- Google Sign In
- Email + password fallback
- Twilio Verify wired for SMS OTP (UK numbers)
- Role selection at signup (customer/tradesman — apprentice is V1)
- Session persistence on app reopen

### Week 3 — Expo scaffold + design system
- Expo Router with Customer / Tradesman tabs
- Theme tokens compiled
- Core components built: Button, Card, StatusBadge, Avatar, InputField, BottomSheet, Toast
- Storybook for component testing (optional but pays back)
- TanStack Query set up with Supabase client
- Zustand for app-level state
- EAS Build configured for iOS dev builds

**Phase 1 exit gate:** you can sign in with Apple, see a role-selected dashboard with seeded data, and post a hello-world update that persists to Supabase.

---

## 5. Phase 2 — The wedge (Weeks 4–7)

If you ship nothing else, this is what matters. Every hour spent on something outside this block is a week of delay.

### Week 4 — Tradesman onboarding + project create
- Tradesman business profile screen (name, trade, photo, postcode)
- Project create flow (4 steps from the prototype: trade → customer → dates → review)
- SMS invite via Twilio sent on project create
- Universal Links set up (`tradesmenapp.uk/i/{code}` resolves to App Store if not installed, deep-links to invite acceptance if installed)

### Week 5 — Customer onboarding from SMS
- Deferred deep link via Branch or AppsFlyer (Apple's built-in Universal Links cover most cases now)
- Customer sees the welcome screen with project preview
- Phone confirm with the number from the SMS invite
- Customer lands on `c-project` screen

**By end of Week 5: tradesman can invite a customer; customer can install and see their project. This is the moment your wedge is real.**

### Week 6 — Timeline feed (the core habit loop)
- Photo upload (image picker, max 6 photos, compress to 1600px, upload to Supabase Storage)
- Post update screen (camera-first, voice transcribe via Apple Speech)
- Customer-side timeline feed with realtime updates (Supabase Realtime CDC)
- Reactions + comments
- Skeleton states + optimistic UI

### Week 7 — Milestone system + status
- Trade-specific milestone templates (kitchen, bathroom, extension, etc.)
- Status taxonomy implementation (8 states from doc 02)
- Status change flow with auto-composed customer message
- Progress ring tied to milestone completion
- "Delayed" status with reason picker

**Phase 2 exit gate:** a real tradesman can run a real project on the app for a week. Post 3+ updates per project, customer sees them in <3 seconds of posting.

---

## 6. Phase 3 — Money + chat (Weeks 8–10)

### Week 8 — Push notifications + chat shell
- Expo Push tokens registered on signup
- Notification triggers wired: new update, message, status change, milestone
- Custom notification pre-prompt (from the prototype) shown before iOS dialog
- 1:1 chat screen (text only for now)
- Realtime message delivery

### Week 9 — Stripe Connect + first payment
- Stripe Connect Express onboarding (this is 5–10 days of work alone — start early)
- Tradesman links bank account via Stripe-hosted flow
- Quote creation (line items, VAT toggle)
- Customer-side approve + Apple Pay deposit
- Funds settle to tradesman's Stripe balance (~T+2)

### Week 10 — Final invoice + project completion + chat polish
- Invoice creation
- Final payment via Apple Pay
- Project completion flow
- Review prompt to customer (star rating + one-line review)
- Tradesman reviews aggregated on profile
- Chat: photo upload, voice notes, read receipts

**Phase 3 exit gate:** the full happy path works end-to-end. Tradesman creates project → customer joins → updates posted → deposit paid → work done → final invoice paid → review left.

**If Week 8 is slipping:** drop Stripe Connect entirely. Use a Google Form for payment requests in beta. Ship the timeline + chat without payment. Payment is V1.

---

## 7. Phase 4 — Polish (Week 11)

The 1-week polish budget is sacred. Don't compress it.

- Every screen reviewed against the design system (in 30-min sessions per screen)
- Every empty state, loading state, error state checked
- Haptics audited (fires on success, failure, milestone, payment — never on routine taps)
- Dark mode parity verified
- Accessibility pass (VoiceOver, Dynamic Type, contrast)
- Copy review against the rules in `03_Design_System.md` Part E
- Pull-to-refresh on every list
- Performance: 60fps on iPhone 12 minimum
- Crash-free rate >99.5% in Sentry

---

## 8. Phase 5 — Private beta (Week 12)

5 tradesmen + their first 15 customers. Each tradesman onboarded **in person**.

- TestFlight build
- Daily check-ins with each design partner
- Bug fixes shipped same-day if possible
- One shared Slack channel with all design partners
- Weekly NPS check ("Would you be sad to lose this?" — Sean Ellis test)

**Phase 5 exit gate:** Sean Ellis score > 40% (>40% of users say they'd be "very disappointed" without it). If you're below 30%, do NOT scale — iterate the product.

---

## 9. Phase 6 — Public TestFlight + App Store (Weeks 13–15)

### Week 13 — App Store prep
- App Store metadata: name, subtitle, description, keywords, category
- 6 screenshots × 3 device sizes (iPhone 6.7", 6.5", 5.5")
- Preview video (optional but lifts conversion ~15%)
- Privacy nutrition label (Apple's data disclosure form — be honest, "Data Linked to You" includes phone/email/photos)
- App Privacy Policy hosted on tradesmenapp.uk
- Age rating questionnaire (likely 4+)

### Week 14 — Submit + handle review
- Submit to App Review (allow 3–7 days)
- Common rejection reasons to head off:
  - Sign in with Apple required when using any other social sign-in (must add Apple)
  - Demo account required (provide a tradesman test login)
  - Stripe Connect onboarding flow can confuse reviewers — add walkthrough notes
- iterate any rejection notes within 24h

### Week 15 — Public TestFlight + soft press
- Open TestFlight link in selected trade Facebook groups (UK Builders, Electricians Forum UK)
- Founder personally answers every signup
- 30–50 tradesmen onboarded
- Track top 5 friction points daily

---

## 10. Phase 7 — Soft launch (Weeks 16–18)

Goal: 100 tradesmen, ~300 active projects, ~1,000 customer accounts.

### Channel mix (in priority order — per the PRD)
1. **Referrals from design partners** — £100 Amazon voucher per referred tradesman who completes 1 project
2. **Trade Facebook groups** — founder personally engages
3. **Targeted Meta ads** — only after the messaging is proven
4. **Trade counters at Screwfix / Toolstation / Howdens** — flyers + QR codes (cheap, high-intent)

### Daily founder work in this phase
- 1 hour: support tickets / WhatsApp from tradesmen
- 1 hour: in-person onboarding of new tradesman (yes, drive to their van)
- 2 hours: bug fixes / feature requests
- Rest: marketing / outreach

### Don't do yet
- Paid acquisition at scale (CAC isn't validated)
- Hiring (you'll need it later — not yet)
- V1 features (the wedge isn't proven yet)

**Phase 7 exit gate:** 100 tradesmen on board, NPS > 50 at project completion, >60% D30 retention.

---

## 11. Phase 8 — V1 features (Weeks 19–32)

Now you've earned the right to expand. Order matters.

### V1.1 — Verified badges (Weeks 19–22)
The biggest customer-trust unlock. From `01_Strategy.md`:
- Gas Safe API integration
- NICEIC number validation
- Insurance certificate upload + manual review
- CSCS card upload
- "Verified" badge on tradesman profile, search result cards
- Pending state: "Sent for verification — usually 24h"

### V1.2 — Crew Hub (Weeks 23–28) — the feature in Deliverable 06
You already have the design. This is execution.
- Apprentice/crew role (new RLS policies)
- 4 new tables: `crew_members`, `job_assignments`, `job_briefs`, `job_tasks`
- All 13 screens from the prototype's onboarding + crew flow
- Lead-side: today board, week grid, brief composer, job day detail
- Crew-side: My day, job detail, crew chat
- Realtime subscription on `job_assignments:user_id={id}`

### V1.3 — Milestone-stage payments (Weeks 29–32)
- Stripe Connect with split payments (deposit + n milestones + final)
- Customer-side approval per milestone
- Dispute flow scaffolding (manual handling still)

### V1.4 — Web view for customers (Week 32)
- Read-only project view at `tradesmenapp.uk/p/{slug}`
- Lets Android customers see what's happening even without the app
- Helps with SEO + sharing

---

## 12. Phase 9 — V2 marketplace (Months 7–12)

Per Deliverable 05 — customer-led discovery, tradesman ranking, earned trust signals.

This phase needs:
- A real product manager (your second hire)
- Paid customer acquisition (now CAC is measurable)
- Multi-trade projects
- Public reviews surface area

Don't start V2 until tradesman D90 retention is >50%. Otherwise you're filling a leaky bucket.

---

## 13. Non-code workstreams (running in parallel from Phase 0)

These get forgotten and bite you. Each one is owned by the founder until you hire.

### 13.1 Customer support
- **Phase 1–6:** founder responds personally to every message, target <2hr response
- **Phase 7+:** Intercom or Crisp (£40/mo), founder still triages
- **V1+:** first ops hire takes this over

### 13.2 Marketing / content
- **Phase 0:** landing page + waitlist
- **Phase 5–6:** founder posts in trade Facebook groups daily
- **Phase 7:** 1 blog post per week — anxiety-led ("how to know if your builder is ghosting you", "what counts as a normal delay") — ranks well, builds organic
- **V1+:** marketing hire or freelancer

### 13.3 Sales / partnerships
- Trade associations (FMB, NICEIC, Federation of Master Builders) — relationship-building from Phase 6
- Accountant integrations (FreeAgent, Xero) for V1+
- Insurance partner referrals (Hiscox, Simply Business) for V1+

### 13.4 Operations
- Runbook for incidents (Supabase down, Stripe failures, push notification outage)
- On-call rotation: founder for now, alarm-on-call later
- Status page (statuspage.io free or use Supabase status page widget)
- Weekly metrics review every Monday morning

### 13.5 Finance
- Monthly P&L (Tide/Mettle exports → Google Sheet, or FreeAgent £19/mo)
- Cash runway tracker — know your zero date every Monday
- VAT registration at £85k revenue
- Quarterly accountant review

### 13.6 Legal (ongoing)
- T&Cs reviewed every time pricing changes
- GDPR data deletion process (must work in <30 days)
- App Store guideline updates (Apple changes rules quarterly)
- Stripe + Twilio + Supabase TOS re-reviewed annually

---

## 14. Hiring plan: who, when, why

The strategy doc says solo founder for MVP. Here's when that breaks.

| Headcount | Trigger | First hire |
|---|---|---|
| 1 (you) | Weeks 1–16 | — |
| 2 | 100 tradesmen on platform OR weekly support load > 15h | **Customer success / ops** (£35–45k or 0.5–1% equity contractor at first). Frees you for product. |
| 3 | Need to ship V1.2 Crew Hub in parallel with V1.1 verifications | **Full-stack RN engineer** (£70–90k or contract). Frees you for product strategy + sales. |
| 4 | V2 marketplace planning | **Product / growth marketer** (£55–75k). Frees you to be the CEO. |
| 5–6 | 500+ tradesmen, multi-channel acquisition | Second engineer, designer (contract or FTE) |

**Hiring rule:** never hire to "do something I could be doing." Hire to do the thing you should *stop* doing. Your time at this stage is worth £200/hr+ — anything below that should be delegated.

---

## 15. Funding gates

Per the strategy doc the founder is bootstrapping the MVP. Here are the gates where outside money helps versus hurts.

### Gate 0 — Now to launch (Phases 0–7)
- **Need:** ~£15–25k all-in if everything in-house (Apple dev fee, design freelance, legal, hosting, SMS, Stripe testing). Less if founder is solo + frugal.
- **Source:** founder savings, friends & family
- **Don't:** take VC money before product-market fit. Tradesmen don't care about your investors.

### Gate 1 — After 100 tradesmen (Phase 7 exit)
- **Trigger:** retention numbers proving the wedge works
- **Need:** ~£300–500k pre-seed for first hire + 12 months runway
- **Source:** UK angels in PropTech / trades / B2B SaaS; Seedcamp, SFC Capital, Founders Factory
- **Use of funds:** 70% engineering + ops, 20% marketing, 10% legal/finance

### Gate 2 — After £500k ARR (V1.3 / V2 start)
- **Trigger:** Pro tier subscribers + payment processing volume validate unit economics
- **Need:** £2–4m seed round
- **Source:** UK + EU seed funds (Octopus, LocalGlobe, Hoxton, Connect Ventures)
- **Use of funds:** product expansion (marketplace), team scale, paid acquisition

**Anti-pattern:** raising too early forces hiring before you've earned the right. Don't.

---

## 16. Metrics ladder — what to watch when

Different phases optimize for different things. Mixing them up kills companies.

### Phase 2–5 (Build → private beta)
**Watch:** time-to-first-update from project creation. Should be <24h. If a tradesman doesn't post in day 1, they never will.

### Phase 5–7 (Beta → soft launch)
**Watch:**
- Sean Ellis "very disappointed" score (target >40%)
- D30 tradesman retention (target >60%)
- Updates per active project per week (target >3)
- Customer NPS at project completion (target >50)

### Phase 7+ (Soft launch onward)
**Watch the north star:** active projects with a customer-side login in the last 14 days.
- Activation: % of invited customers who install + view project = >70%
- Engagement: median updates per project per week = 3+
- Monetisation (V1+): % of tradesmen on Pro after 60 days = >25%
- LTV/CAC: target 3:1 at maturity

### Anti-metrics (do NOT optimise)
- Total signups (vanity)
- Customer DAU (should be low — they should be reassured not anxious)
- Session length (shorter is better)
- Total messages sent (incentivises chat, not project completion)

---

## 17. Risks ranked by what kills the company

Honest assessment, ranked by impact × probability.

### 17.1 Tradesmen don't change habits from WhatsApp
**Likelihood: very high · Impact: total**
Mitigations:
- The update flow MUST be faster than WhatsApp at the moment of update (camera-first, voice-to-text, defaults to last project)
- Founder onboards every tradesman in person for the first 100
- Track time-to-post obsessively in PostHog
- If average time-to-post > 60 seconds, drop everything and fix it

### 17.2 First 10 customers carry the reputation
**Likelihood: medium · Impact: high**
Mitigations:
- Manually vet every tradesman for the first 50 — visit them, check their work, talk to past customers
- Public reviews from day one
- Founder personally responds to any complaint within 2 hours
- One Mumsnet thread early kills the brand for years

### 17.3 Solo founder burnout / 12-week slip becomes 24
**Likelihood: high · Impact: high**
Mitigations:
- The hard rule: if Week 8 is bad, drop Stripe and ship without payments
- Hire customer success ops at 100 tradesmen, not at 500
- One weekend off every two weeks, non-negotiable
- Therapist / coach budgeted £200/mo from Phase 7 onwards

### 17.4 Stripe Connect onboarding takes longer than expected
**Likelihood: medium · Impact: medium**
Mitigations:
- Start Stripe Connect application Week 1 (not Week 9)
- Account review can take 1–2 weeks
- Have a manual-payment fallback documented (PDF invoice + bank transfer)

### 17.5 App Store rejection
**Likelihood: medium · Impact: low (1–2 week delay)**
Mitigations:
- Sign in with Apple included (the most common rejection)
- Demo account included in App Review notes
- Privacy nutrition label honest
- Onboarding doesn't require account before usage trial (some review teams flag this)
- Submit during a quiet release week if possible

### 17.6 Compliance: GDPR + UK consumer law
**Likelihood: low · Impact: high if it hits**
Mitigations:
- Data deletion works (test it monthly)
- Consumer Rights Act 2015 applies to tradesman services — your T&Cs make this the tradesman's responsibility, not yours
- Cookie banner on the web (Phase 8+)
- Age gate at signup (18+ only)

### 17.7 Bad actor uses the app for fraud
**Likelihood: low–medium · Impact: medium**
Mitigations:
- Stripe Radar on every payment
- Manual review of any payment >£5k for the first 6 months
- Identity verification (Stripe Identity, £1/check) for any tradesman processing >£10k
- Insurance: £1m+ professional indemnity + public liability via Hiscox (~£40/mo for an early-stage business)

---

## 18. The "we'll need this eventually" backlog

Things to write down now, don't build, but don't forget.

### Product
- In-app onboarding tour overlays (you said no in the design system; revisit if activation drops)
- Tradesman calendar sync (Google Calendar, iCloud)
- Customer portal on web (for Android customers)
- Document storage (planning permits, drawings)
- Lead-generation from V2 marketplace
- Referral program (customer refers customer)
- Multi-trade projects (extension with builder + electrician + plumber)
- Disputes flow with platform mediation
- Subscription management (Pro tier, family plans for trades)

### Operations
- A real admin panel (Retool or hand-built) — currently using Supabase Studio
- On-call rotation (PagerDuty or Better Stack)
- Automated tradesman onboarding (currently manual)
- Localisation (Welsh? Scottish? Irish UI tweaks?)
- Custom reporting for accountants (export project history, profit per job)

### Legal
- Business insurance products (we refer to Hiscox, they pay us £30/lead)
- Material supplier integrations (Howdens, B&Q discount codes for app users)
- Mortgage/finance integrations (some customers want to finance their renovation)

### Brand
- Custom illustrations to replace SF Symbols in V1+
- Sound design (premium notification sounds — sparingly)
- Marketing video (one good 30-sec spot for paid ads)

---

## 19. What I'd watch in the founder's calendar each phase

The strategy doc is excellent. The PRD is detailed. But how a founder spends time signals what they actually believe. Here's the time allocation that matches the plan.

| Phase | % Code | % Talking to users | % Marketing | % Ops/Admin |
|---|---|---|---|---|
| Phase 0 | 0 | 60 | 20 | 20 |
| Phase 1–3 | 70 | 20 | 5 | 5 |
| Phase 4 | 60 | 30 | 5 | 5 |
| Phase 5–6 | 30 | 50 | 10 | 10 |
| Phase 7 | 20 | 50 | 20 | 10 |
| Phase 8+ | 10 | 30 | 30 | 30 (or hire) |

If you find yourself coding 70% of the time in Phase 7, you're hiding from sales. That's the most common failure mode for technical founders.

---

## 20. This week's three actions

If you do nothing else in the next 7 days, do these.

1. **Book 10 in-person interviews with target tradesmen.** Use the Tradesmen Uber prototype. Take notes on which screens get a reaction. £5 voucher per interview is fine.
2. **Form the Ltd company + open Tide account + claim the domain.** £100 and a few hours. Don't start coding without legal entity protection.
3. **Initialise the Expo + Supabase project. Compile your design tokens.** No features yet — just the skeleton. Push it to GitHub. This single commit kills the "I'm going to start soon" procrastination forever.

---

## 21. Closing — what this product becomes

If this works, in three years Tradesmen Uber is the default UK consumer app for any home renovation project over £5k. It's referenced in news articles about builder disputes, recommended by mortgage brokers when customers ask "how do I know my builder is real?", and integrated into insurance products as a project-tracking benefit.

The wedge — anxiety-reduction software for home projects — becomes the brand promise. The Crew Hub becomes the operations layer. The marketplace becomes the discovery layer. The verified badges become the trust layer. All of them sit on the same realtime spine: a customer who never wonders where their project stands.

That's the prize. The roadmap above is how to get there.

---

*End of Deliverable 7. Companion to 01 Strategy · 02 Architecture · 03 Design System · 04 Prototype · 05 V2 Vision · 06 Crew Hub. Next update: post-launch retrospective (estimated month 7).*
