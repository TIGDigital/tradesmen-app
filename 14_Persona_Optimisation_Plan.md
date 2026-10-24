# Persona optimisation plan — 24 Oct 2026

Source: three parallel audits (tradesman / customer / crew), full findings in
session history. This file is the working plan; items get ticked as they ship.

## The root cause (named by all three audits)

Screens decide what to show from the ACCOUNT role (`profile.role`), not the
viewer's RELATIONSHIP to the project. Consequences: crew see the lead's
tooling (money, invites, approvals) and get silent failures; a subcontractor
tradesman on someone else's job gets the full lead UI; customers see crew
management and live invite codes. The fix that unlocks everything:
`useProjectRole(projectId)` → `{ isLead, isCrew, crewRole, isCustomer }`,
used by every project screen.

## Tier 0 — bugs and security (ship first)

- [ ] Pricing screen poisons the `['project', id]` cache with a different
      shape → crash risk + blank screen for crew. Own key + own fetch.
- [ ] `quoted_amount` never selected by `fetchProject` → agreed price never
      shows anywhere. Select it; show "£X agreed".
- [ ] Customers can read pending/rejected crew posts (RLS + 5 client spots +
      `mark_updates_seen` stamps them). Server-side filter.
- [ ] Crew cannot read or flag snags (RLS pair-only) → `is_project_participant`.
- [ ] Crew can't read participant names (profiles RLS) → participants policy.
- [ ] SECURITY: crew invite codes enumerable by anyone (public select policy)
      → lookup-by-code SECURITY DEFINER RPC, drop policy. App + DB together.
- [ ] SECURITY: customer invite preview exposes pending_customer_phone +
      address to any signed-in user → safe-fields preview RPC, drop policy.
- [ ] "End my day" tap logs a false confirmed left_site event + notifies self.
- [ ] Get-started checklist: × doesn't stick, shows to apprentices,
      disabled-query refetch bypass.
- [ ] Jobs list only loads for apprentices by accident (enabled flag).

## Tier 1 — the distinction programme

### A. useProjectRole hook + gating sweep
Replace `role === 'tradesman'` / `role !== 'customer'` checks in:
project/[id]/index, crew, schedule, quote/[id], snag/[id], pricing, tasks,
jobs, AccountView. Lead-only: status, invites, approvals, milestones editor,
quotes/pricing, crew management, end-of-day. Crew lose the money entirely.

### B. Crew shell `(crew)` — apprentices routed OUT of the tradesman shell
- Today tab: day's job card (address→Maps, lead, today's milestone), my open
  tasks across projects, my pending/rejected posts ("Waiting for {lead}" with
  rejection reasons), other projects.
- Messages (crew-labelled rows), Activity (NotificationsView as-is),
  Account (AccountView as-is).
- Crew can POST: compose CTA for crew, "Sent to {lead} for approval"
  confirmation, author sees own pending/rejected posts in feeds.
- Close the approval loop: notify author on approve/reject (deep-link),
  notify customer on approve + helper posts, lead's pending push deep-links
  to Approvals.
- Crew onboarding steps + tour slides; skip location consent for crew.

### C. Customer calm pass
- "Waiting on you" card on home: quote to review / price change / snag
  sign-off / agreed price + next milestone. Replace stat tiles.
- statusHeadline customer fixes: start-vs-end date, full dates, delay reason
  + revised finish, no dead "tap to..." prompts, no self-contradictions.
- Confirmations: snag reported ("{lead}'s been told"), price decision,
  document upload ("{lead} can see this").
- Notify customer on: delay/status change, approved crew posts, snag
  resolution (reporter), quote/price-change withdrawal.
- Hide crew management for customers → read-only "Who's on site".
- Role-aware copy sweep (Your note / Waiting for your OK / "Quote to
  review"), EventPill for system rows, feed tap → update thread.
- Chat: sender names + timestamps; isMine by sender_id.

### D. Tradesman cockpit
- Lead-voiced hero headline with actionable lines; sticky action bar
  (End day · Update · Snag · Chat).
- Call/WhatsApp customer, address → Maps.
- Completed chip on Jobs; splash skipped when signed in; cold-start push
  replay (getLastNotificationResponseAsync).
- Settings rows into Account; row counts on project cards.
- Jobs action signals (aggregate RPC) — phase 2.
- Edit project screen + start/end dates on create — phase 2.
- Sole trader path (no Companies House) — awaiting Todd's call (H14).

## Deliberately deferred
Per-user chat read receipts / separate crew channel (schema), geofenced crew
end-of-day, bulk approve, Jobs search, invite deep-link associated domains,
Android Alert.prompt replacements, progress-from-milestones ring.
