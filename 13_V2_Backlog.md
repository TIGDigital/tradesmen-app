# Phase — V1.1 / V2 backlog

Ideas agreed worth doing, deliberately parked until after App Store launch.
Order within sections is rough priority. Nothing here blocks the MVP.

## V1.1 candidates (first post-launch cycle)

### 1. Multiple customers per project (households)
A £50k extension is a household decision — husband and wife both want the
photos and both care about the price. Today `projects.customer_id` is a
single column and ~59 references across 16 migrations (RLS policies, RPCs)
assume one customer, so this is a structural change, not a field:

- `project_members` junction (role `customer`), invite flow issues codes
  per person
- Decide approval semantics: either partner can approve, audit records who
- Read receipts per member; chat becomes the project's customer thread
- Notification fan-out to all customer members

Interim workaround (fine for beta): the household shares one login on two
phones — sessions persist per device.

### 2. Quote payment schedule (records, not rails)
If beta testers ask to "track money": deposit / stage payments / final
balance lines on an approved quote, each with a manual "mark as paid" tick.
Pure record-keeping — no Stripe Connect, no money movement, no disputes.
Fits "we'll never leave you wondering" (payment visibility). Buildable in
a day on top of project_quotes.

**Decided and standing:** Phase never moves job money. Card rails don't fit
£5k–£100k UK trade jobs (fees, chargebacks, bank-transfer culture).

### 3. Pricing + billing (monetisation)
Model agreed 21 Oct 2026: charge the tradesperson, homeowners free forever,
crew seats under the lead's subscription.

- Free tier: 1 active project. Solo ~£15–20/mo: unlimited projects.
  Crew ~£30–35/mo: crew posting + apprentice approval queue.
- Beta testers get a founders' price (~£9/mo locked) as thanks.
- Sell via website checkout (Stripe **Billing** — our subscription revenue
  only), not in-app purchase, to avoid Apple's cut.
- Needs: pricing page on getphase.co.uk, entitlement checks in-app,
  Stripe Billing + webhook → Supabase.
- Turn on at or shortly after App Store launch, not before.

## Later / unscheduled

- Remove `(supabase as any)` bridges (documents, snags, reminders, pricing
  services) + types regen
- Maestro typed-signup flow on a dev-client build (Expo Go keyboard flake)
- OTA pipeline revisit (only after clean `npm ci` + build-stamp-verified test)
- Android build (Expo makes this mostly config + Google sign-in plumbing)
