# Tradesmen Uber — Design System & Hero Screen Specs

**Deliverable 3 of 4** · References Deliverables 1 (Strategy) & 2 (Architecture)
*Premium, calm, native iOS feel. Built for Expo / RN. Token-first, component-first.*

---

## Part A — Design Principles

### A.1 The five rules everything follows

1. **Above the fold tells the customer everything they need in 4 seconds.** Status, latest update, next milestone. No scrolling, no decisions.
2. **Reassurance is a design element.** Every empty state, every error, every loading state says something calming and specific.
3. **One primary action per screen.** Never make the user choose between two equally-weighted buttons.
4. **Type carries the hierarchy, not boxes.** Soft surfaces, strong type. Borders are a last resort.
5. **Motion is meaning, not decoration.** Animations communicate state changes; they never delay the user.

### A.2 What this design system rejects
- Dense tables of data
- Multiple competing call-to-actions
- Bright accent colours for "engagement"
- Hard borders and grid lines (clinical, enterprise)
- Stock illustrations with cartoon people in hard hats
- Progress bars that don't match reality
- Notification badges for unimportant things
- Modals stacked on modals

---

## Part B — Design Tokens

### B.1 Colour

The palette is **calm-confident**: neutral whites and warm greys, a single trust-signal blue, deliberate use of green/amber/red for state. Saturated colours are rare and always state-driven.

#### Base palette
| Token | Light mode | Dark mode | Use |
|---|---|---|---|
| `bg/canvas` | `#FBFAF7` | `#0E0E10` | App background — warm off-white, never pure |
| `bg/surface` | `#FFFFFF` | `#19191C` | Cards, sheets, elevated surfaces |
| `bg/surface-2` | `#F4F2EE` | `#222226` | Secondary cards (nested), input fields |
| `bg/scrim` | `rgba(11,11,12,0.35)` | `rgba(0,0,0,0.55)` | Sheet & modal backdrop |
| `border/subtle` | `#ECEAE4` | `#2A2A30` | Dividers — rarely used |
| `border/strong` | `#D8D5CE` | `#3A3A42` | Inputs only |

#### Text
| Token | Light | Dark |
|---|---|---|
| `text/primary` | `#0B0B0C` | `#FAFAF7` |
| `text/secondary` | `#52524F` | `#A8A8A2` |
| `text/tertiary` | `#8B8A85` | `#6D6D67` |
| `text/inverse` | `#FFFFFF` | `#0B0B0C` |
| `text/link` | `#1B4DD9` | `#7FA4FF` |

#### Brand
| Token | Value | Use |
|---|---|---|
| `brand/primary` | `#1B4DD9` | Primary buttons, key brand moments. *One blue, used sparingly.* |
| `brand/primary-pressed` | `#143BAA` | Pressed state |
| `brand/tint` | `#EAF0FF` | Soft brand background (e.g. invite hero) |

#### Status colours (project_status enum from architecture doc)
| Status | Token | Light | Dark | Meaning |
|---|---|---|---|---|
| `quote_sent` | `status/pending` | `#8B6F2A` on `#FBF3DC` | `#F4D58B` on `#3A2F11` | Action required from customer |
| `scheduled` | `status/scheduled` | `#1B4DD9` on `#EAF0FF` | `#7FA4FF` on `#0F1F45` | Booked, all clear |
| `materials_ordered` | `status/waiting` | `#1B4DD9` on `#EAF0FF` | same | Waiting on supplier |
| `in_progress` | `status/active` | `#197A4D` on `#E2F5EA` | `#62D69B` on `#0F2A1D` | Work happening — the "good green" |
| `delayed` | `status/delayed` | `#A04A1C` on `#FBE9DC` | `#F4A872` on `#3A1F0E` | Warm amber, never red. Delays are normal. |
| `awaiting_approval` | `status/approval` | `#8B6F2A` on `#FBF3DC` | `#F4D58B` on `#3A2F11` | Customer must act |
| `awaiting_inspection` | `status/inspection` | `#5B4A8B` on `#EFEAFB` | `#B5A2F4` on `#221A38` | Third-party blocker |
| `completed` | `status/done` | `#0B0B0C` on `#F4F2EE` | `#FAFAF7` on `#222226` | Done, neutral. Not celebratory. |

> **Critical:** never use pure red (#FF0000 family) for `delayed`. Red triggers panic. We use warm amber. Pure red is reserved for destructive actions (delete account, void invoice).

#### Destructive
| Token | Light | Dark |
|---|---|---|
| `destructive/text` | `#B5301A` | `#F47A65` |
| `destructive/bg` | `#FBE1DC` | `#3A150E` |

#### Elevation (shadows — generous on light, subtle on dark)
| Token | Light | Dark |
|---|---|---|
| `elevation/1` | `0 1px 2px rgba(11,11,12,0.04), 0 1px 1px rgba(11,11,12,0.03)` | `0 1px 2px rgba(0,0,0,0.4)` |
| `elevation/2` | `0 4px 12px rgba(11,11,12,0.06), 0 1px 2px rgba(11,11,12,0.04)` | `0 4px 12px rgba(0,0,0,0.5)` |
| `elevation/3` | `0 12px 32px rgba(11,11,12,0.08), 0 4px 8px rgba(11,11,12,0.04)` | `0 12px 32px rgba(0,0,0,0.6)` |
| `elevation/sheet` | `0 -8px 32px rgba(11,11,12,0.10)` | `0 -8px 32px rgba(0,0,0,0.6)` |

### B.2 Typography

**Family:** SF Pro Display (≥ 20pt) / SF Pro Text (< 20pt) — system default on iOS.
**Fallback:** Inter for Android (V1).

| Token | Size / line / weight | Use |
|---|---|---|
| `type/display` | 34 / 41 / 700 | Hero headers (rare — onboarding only) |
| `type/title-1` | 28 / 34 / 700 | Screen titles |
| `type/title-2` | 22 / 28 / 700 | Section headers |
| `type/title-3` | 20 / 25 / 600 | Card titles, project names |
| `type/body-lg` | 17 / 24 / 400 | Default body, list rows |
| `type/body-lg-emphasis` | 17 / 24 / 600 | Emphasised body |
| `type/body` | 15 / 22 / 400 | Secondary body |
| `type/footnote` | 13 / 18 / 400 | Metadata, timestamps |
| `type/caption` | 11 / 14 / 500 | Status pills, labels |
| `type/mono` | 14 / 20 / 500, SF Mono | Codes (invite code), figures |

**Letter spacing:**
- All caps `type/caption`: `+0.4`
- Display: `-0.3`
- Everything else: default

**Hierarchy rules:**
- No more than 3 type sizes visible on screen at once
- Weight differences > size differences for hierarchy
- Body text never under 15pt

### B.3 Spacing — 4pt base scale

| Token | Value |
|---|---|
| `space/0` | 0 |
| `space/1` | 4 |
| `space/2` | 8 |
| `space/3` | 12 |
| `space/4` | 16 |
| `space/5` | 20 |
| `space/6` | 24 |
| `space/8` | 32 |
| `space/10` | 40 |
| `space/12` | 48 |
| `space/16` | 64 |
| `space/20` | 80 |

**Layout rules:**
- Screen horizontal padding: `space/5` (20)
- Card internal padding: `space/4` to `space/5`
- Vertical rhythm between sections: `space/6` to `space/8`
- Tappable target minimum: 44×44pt (iOS HIG)

### B.4 Radius

| Token | Value | Use |
|---|---|---|
| `radius/sm` | 8 | Pills, small chips |
| `radius/md` | 12 | Buttons, inputs |
| `radius/lg` | 16 | Cards |
| `radius/xl` | 24 | Large cards, bottom sheets (top corners) |
| `radius/2xl` | 32 | Hero cards |
| `radius/full` | 9999 | Avatars, status dots |

### B.5 Motion

**Reanimated 3** for everything. No Lottie unless absolutely necessary.

| Token | Duration | Curve | Use |
|---|---|---|---|
| `motion/fast` | 150ms | `easeOut` (0.2, 0, 0, 1) | Colour, opacity, small transforms |
| `motion/normal` | 240ms | `easeOutQuart` (0.25, 1, 0.5, 1) | Most transitions |
| `motion/slow` | 360ms | `easeOutQuart` | Sheet rise, screen push |
| `motion/spring/snappy` | spring (damping 18, stiffness 220) | — | Card interactions |
| `motion/spring/gentle` | spring (damping 22, stiffness 140) | — | Status changes, reveals |

**Rules:**
- Status badge transitions: cross-fade `motion/normal`, no scale
- New timeline update arrives: slide-in from top `motion/spring/snappy` + 1.0 → 0.0 fade (gentle, not jumpy)
- Milestone tick: spring scale 0.8 → 1.0 + green checkmark fade-in
- Pull-to-refresh: native iOS spinner
- All press states: 95% scale + opacity 0.92, `motion/fast`

### B.6 Haptics

| Trigger | Pattern |
|---|---|
| Primary button press | `Haptics.impactAsync(Light)` |
| Toggle / selection | `Haptics.selectionAsync()` |
| Status change to "Completed" | `Haptics.notificationAsync(Success)` |
| Milestone tick | `Haptics.impactAsync(Medium)` |
| Destructive confirm | `Haptics.notificationAsync(Warning)` |
| Error | `Haptics.notificationAsync(Error)` |

**Rule:** if haptics fire more than every 2 seconds on average, you're using them wrong.

### B.7 Iconography

- **SF Symbols** (via `expo-symbols` or `react-native-sfsymbols`). Free, native, scales perfectly.
- Stroke weight: `regular` (default)
- Size: matches text size of nearest label, or 20pt for tab bar / 24pt for inline
- No custom illustrations in MVP. SF Symbols only.

Tab bar icons, **per persona** (with selected state):

**Customer** — *Project · Messages · Updates · Account*
- Project: `house` / `house.fill`
- Messages: `bubble.left` / `bubble.left.fill`
- Updates: `bell` / `bell.fill`
- Account: `person.crop.circle` / `person.crop.circle.fill`

**Tradesman (lead)** — *Jobs · Crew · Messages · Account*
- Jobs: `square.grid.2x2` / `square.grid.2x2.fill`
- Crew: `person.2` / `person.2.fill`
- Messages: `bubble.left` / `bubble.left.fill`
- Account: `person.crop.circle` / `person.crop.circle.fill`

**Apprentice** — *Today · Crew · Messages · Account*
- Today: `calendar` / `calendar.circle.fill`
- Crew: `person.2` / `person.2.fill`
- Messages: `bubble.left` / `bubble.left.fill`
- Account: `person.crop.circle` / `person.crop.circle.fill`

**No search icon, anywhere, ever.** This is a deliberate product decision documented in 01 §5. Discovery is invite-only.

---

## Part C — Component Library

Components are presented in priority order. Each has: purpose, anatomy, states, props, copy rules.

### C.1 StatusBadge

**Purpose:** show project status with the correct status colour token. Reused everywhere.

**Anatomy:**
- Background: `status/{state}` background
- Text: `status/{state}` text
- Optional leading dot (8pt, `radius/full`)
- Padding: 6vert × 12horiz
- Radius: `radius/sm`
- Type: `type/caption` uppercase

**States:** static; transitions handled by parent on prop change.

**Props:** `status`, `size: 'sm' | 'md'`, `withDot: boolean`

**Copy:** uses copy map (e.g. `in_progress` → "In progress", `materials_ordered` → "Materials ordered"). Not "IN_PROGRESS".

### C.2 PrimaryButton

**Purpose:** the one important action on the screen.

**Anatomy:**
- Background: `brand/primary`
- Text: `text/inverse`, `type/body-lg-emphasis`
- Height: 52pt (large) / 44pt (regular)
- Radius: `radius/md`
- Optional leading icon (SF Symbol, 20pt)
- Horizontal padding: `space/5`

**States:**
- Default
- Pressed: scale 0.96, bg `brand/primary-pressed`
- Loading: spinner replaces text, label remains visible faintly
- Disabled: opacity 0.4, no press response

**Rule:** one PrimaryButton per screen. If you think you need two, you need a SecondaryButton.

### C.3 SecondaryButton

Same dimensions, but:
- Background: `bg/surface-2`
- Text: `text/primary`

### C.4 GhostButton

For tertiary actions:
- Background: transparent
- Text: `text/link`
- Same hit area

### C.5 Card

**Purpose:** primary surface for grouping related content.

**Anatomy:**
- Background: `bg/surface`
- Radius: `radius/lg` (16)
- Shadow: `elevation/1` (light), none (dark)
- Padding: `space/4` to `space/5`
- Border: none (`border/subtle` only if shadow disabled for performance)

**Variants:**
- `Card.Update` — for timeline entries
- `Card.Milestone` — checkable
- `Card.Project` — for project list rows
- `Card.Invoice` — with money column right-aligned

### C.6 ListRow

For settings, profile fields:
- Height: 56pt min
- Leading icon (24pt SF Symbol)
- Title (`type/body-lg`)
- Trailing: value (`text/secondary`) or chevron (`chevron.right`, 14pt, `text/tertiary`)
- Divider: `border/subtle`, inset to icon's right edge
- Pressed: bg `bg/surface-2`, `motion/fast`

### C.7 BottomSheet

**Purpose:** secondary flows that don't deserve a full screen (filter, status change form, image preview).

**Anatomy:**
- Top corners: `radius/xl`
- Drag handle: 36×5pt, `bg/scrim` (light), centered, 8pt top margin
- Background: `bg/surface`
- Backdrop: `bg/scrim`
- Detents: `medium` and/or `large` (use iOS native sheet via Expo)

**Behaviour:**
- Swipe down to dismiss
- Tap backdrop dismisses
- Forms inside use full keyboard avoidance

### C.8 Avatar

- Sizes: 24, 32, 40, 56, 80
- Round (`radius/full`)
- If no photo: initials on `bg/surface-2` with `text/secondary`
- Verified badge: small blue check overlay (bottom-right, 1/3 size) when tradesman verified

### C.9 InputField

- Background: `bg/surface-2`
- Border: 1pt `border/strong`, focus 1pt `brand/primary`
- Radius: `radius/md`
- Height: 52pt
- Padding: `space/4` horizontal
- Label: above, `type/footnote` `text/secondary`
- Helper text: below, `type/footnote` `text/tertiary`
- Error: border + helper become `destructive/text`
- Right-aligned trailing element (currency, icon, clear)

### C.10 ProgressRing

- Sizes: 48, 64, 96
- Stroke: 4pt (small) / 6pt (large)
- Track: `border/subtle`
- Fill: `status/active` (default), `status/done` at 100%
- Animation: spring `motion/spring/gentle` on value change
- Centre: percentage (`type/title-3`), optional small label below

### C.11 TimelineUpdate

The flagship component. See spec at Section D.3.

### C.12 ChatBubble

- Sender bubble: right-aligned, `brand/primary` bg, `text/inverse`
- Other bubble: left-aligned, `bg/surface-2`, `text/primary`
- Radius: `radius/lg` with 4pt tail-corner truncation
- Photo attachments: full-width inside bubble, `radius/md` clipped
- Voice: waveform + play button + duration
- Read indicator: small filled checkmark, right of timestamp
- Long-press: action sheet (copy, react)

### C.13 EmptyState

- Centered, vertically + horizontally
- Large SF Symbol (40pt, `text/tertiary`) — never an illustration
- Title (`type/title-3`)
- Body (`type/body`, `text/secondary`, max 2 lines)
- Optional PrimaryButton

**Copy rule:** never start with "No X yet" — always frame what's about to happen. "Your first update will appear here" not "No updates yet."

### C.14 Toast

- Bottom-anchored, 88pt up from bottom edge (clears tab bar)
- `bg/surface` with `elevation/2`
- 4 second auto-dismiss
- Optional retry action
- Slide up + fade in, `motion/normal`

### C.15 SegmentedControl

- Native iOS segmented control via Expo
- Used for: tab-style filters inside a screen (e.g. "All / Updates / Photos / Documents" inside project)

### C.16 InlineAlert

- Soft surface with status-coloured left border (4pt)
- For inline reassurance: e.g. on the project detail when delayed, an InlineAlert says "Materials delayed. Back on track for Friday."
- Icon left, body text, optional CTA right

### C.17 EventPill

**Purpose:** show a discrete location/system event in the Updates feed without the visual weight of a full Card. Used for arrival/left events and milestone ticks.

**Anatomy:**
- Background: `bg/surface` with `border/subtle` 1pt
- Leading SF Symbol (16pt): `mappin.circle` for arrival, `mappin.slash` for left, `checkmark.seal` for milestone
- Text: `type/body` `text/primary` for the action, `type/footnote` `text/tertiary` for the timestamp
- Padding: `space/3` vertical × `space/4` horizontal
- Radius: `radius/lg`
- Height: 56pt
- No press state — informational only

**Copy patterns:**
- Arrival: `"Dave arrived on site"` · `8:14am`
- Left: `"Dave wrapped up for today"` · `4:32pm` (never "Dave left" — feels abandoning)
- Milestone tick: `"Plastering marked complete"` · `2:18pm`

**Rule:** never show coordinates, distance, or a map. The pill is the entire surface area of the location feature for customers.

### C.18 EndOfDayCard

**Purpose:** the heart of the leave-site nudge flow. A pre-filled compose card that the tradesman opens from a push notification and sends in under 20 seconds.

**Anatomy:**
- Modal sheet, top corners `radius/xl`
- Title: `type/title-3` — "Quick update for {customer first name}"
- Subtitle: `type/footnote` `text/secondary` — "Takes about 20 seconds"
- Inline preview of suggested body text (editable inline, single-tap focuses)
- Status pill row: auto-suggested status (e.g. *In progress · Day 3 of 12*), tappable to change
- Two side-by-side affordances: `camera.fill` (add photo) · `mic.fill` (voice note)
- ETA tomorrow row: pre-filled from project schedule, tappable bottom-sheet to override
- Toggle row: "Notify {customer first name}" (default ON, prominent)
- Sticky bottom: PrimaryButton "Send" (full width, 52pt). Loading state replaces text with spinner.
- Above PrimaryButton: GhostButton "Not leaving yet — dismiss" (cancels the nudge but doesn't suppress future ones)

**States:**
- Default — pre-filled, ready to send
- Skipped → silent, but at 8pm the lighter follow-up nudge fires (project doc 01 Flow F)
- Sent → spring success haptic + dismiss + Toast "Update sent to {customer}"

**Apprentice variant:**
- Title becomes "Quick update for {lead_name}"
- Send button reads "Send for {lead_name}'s approval"
- Status pill is hidden (only the lead changes status)
- Below send: small grey footnote — *"{lead_name} will review before {customer} sees it."*

---

## Part D — Hero Screen Specs

Naming convention: `[Role] — [Screen Name]`. All measurements assume iPhone 14 / 15 (390pt width).

### D.1 [Customer] Project Detail — *the most important screen in the app*

**Purpose:** in under 4 seconds, the customer should feel reassured: status is clear, they see the latest update, they know what's next.

**Route:** `/project/[id]` — the default screen when a customer opens the app. Because customer entry is invite-only and 99% of customers have a single live project at a time, this IS the home tab. The "Project" tab in the customer tab bar deep-links here.

**Layout (top to bottom):**

1. **Nav bar** (44pt)
   - Left: back chevron (only if multi-project) or hamburger (`line.3.horizontal`)
   - Title: project title (1 line, truncate). `type/body-lg-emphasis`
   - Right: chat icon with unread badge

2. **Hero card** (`space/5` from top of content, full width with `space/5` horizontal inset)
   - **Status badge** (top of card, left)
   - **Headline** below: `type/title-2`, e.g. "On track for Friday"
     - This is dynamic. See "Status headline copy" table below.
   - **Sub-headline:** `type/body`, `text/secondary`, e.g. "Day 3 of 12"
   - **ProgressRing** right side, 64pt, vertically centered with text
   - Padding: `space/5`, radius: `radius/2xl`, elevation 2
   - Tap → opens BottomSheet with full status detail + reason (if delayed)

3. **Latest update card** (`space/4` gap)
   - "Latest update" `type/caption` `text/tertiary` header above card
   - Tradesman avatar (32pt) + name + timestamp
   - Single-line text preview (2 lines max, truncate)
   - Up to 4 photo thumbnails in a row (60×60pt, `radius/md`, last one shows "+N more" overlay if needed)
   - Tap → opens full update view

4. **Today / next** card
   - Two-line layout:
     - Line 1: "Today" → "Dave is on site" / "No work today" / "Dave is heading over (ETA 8:30)"
     - Line 2: "Next" → "Plastering — Thursday"
   - Calm, single-glance.

5. **Quick actions strip** (horizontally scrolling chips, 44pt height)
   - "View timeline" → routes to timeline feed
   - "Message Dave" → opens chat
   - "View invoice" → invoices tab (only shown if invoice exists)
   - "Photos" → gallery view

6. **Project meta** (below the fold, scrolled into)
   - Address, dates, milestone list with progress
   - Tradesman card with verified badge, rating, "View profile"

**Loading state:** skeleton cards (no spinner). Status badge skeleton is the same shape and size as the real badge — no layout shift.

**Empty/just-joined state:** if no updates yet, hero card shows "Welcome, [name]. Dave is preparing your project — your first update should arrive within 24 hours." Photo placeholder shows a soft `bg/surface-2` rectangle.

**Status headline copy (the reassurance layer):**

| Status | Headline | Sub-headline |
|---|---|---|
| `quote_sent` | Quote ready for you | Tap to review |
| `scheduled` | Booked for {start_date} | Dave starts {relative time} |
| `materials_ordered` | Materials on order | Expected back on site {date} |
| `in_progress` | On track for {end_date} | Day {n} of {total} |
| `delayed` | Slight delay, still on track | New date: {new_date} |
| `awaiting_approval` | Needs your approval | Tap to review |
| `awaiting_inspection` | Awaiting inspection | Inspector booked for {date} |
| `completed` | All done | Tap to leave a review |

**Pull to refresh:** native iOS, re-fetches with TanStack Query's invalidation.

**Realtime:** subscribed to `project:{id}` channel from architecture doc. New updates animate in at the top of the "Latest update" card with a soft slide.

### D.2 [Customer] Timeline Feed

**Purpose:** full chronological history of the project. Feels like a calm social feed.

**Route:** `/project/[id]/timeline`

**Layout:**
- Nav bar: title "Timeline", back, filter button (`line.3.horizontal.decrease`)
- Segmented control: "All / Updates / Photos / Documents"
- Pull-to-refresh
- Vertical list of `TimelineUpdate` components (see C.11)
- Grouped by day with sticky day-of-week header (`type/caption` `text/tertiary`, e.g. "TUESDAY, 14 MAY")

**TimelineUpdate component anatomy:**
- Left rail: 2pt-wide vertical line in `border/subtle`, runs full height, connecting all updates of the day
- Avatar (40pt) intersecting the rail
- Card to right of avatar:
  - Sender name + timestamp (`type/footnote`)
  - Body text (`type/body-lg`)
  - Media grid: 1 photo full-width, 2 photos side-by-side, 3+ in 3-col grid with "+N" overlay on last
  - Reactions row: pill with count if any (e.g. "👍 2", `bg/surface-2`)
  - Comments row: "View 3 comments →" link
- For `type='status'` or `'milestone'` updates: smaller, no avatar, centered system-message style ("Plastering complete ✓", colored by status)
- For `type='eta'`: special card with map preview (V2) or just text ("Dave is heading over — arriving ~8:30")
- For `type='arrived_at_site'` / `'left_site'`: render as `EventPill` (C.17). Smaller, no avatar, leading `mappin.circle` icon. *"Dave arrived on site · 8:14am"*

**Empty state:** "Your first update will appear here. Dave usually posts once per working day."

**Realtime:** new updates slide in from top with spring; haptic if app foregrounded.

### D.3 [Customer] Chat

**Purpose:** 1:1 messaging with tradesman, scoped to the project. Replaces WhatsApp.

**Route:** `/project/[id]/chat`

**Layout:**
- Nav bar: avatar + name (tap → tradesman profile), call icon (deeplinks to phone — V0 keeps this option)
- Message list (inverted FlatList)
- Day separators (centered `type/caption` `text/tertiary`)
- ChatBubble components (C.12)
- Input bar at bottom: text input, camera icon, mic icon, send (only when typed)
- Voice recording: long-press mic → live waveform appears across input, release to send, drag-left to cancel (iMessage pattern)

**Read receipts:** mark messages read when scrolled into view (server PATCH).

**Typing indicator (V1):** broadcast via Realtime channel.

**Empty state:** "Say hello — Dave will see this on his phone."

### D.4 [Customer] Invoice / Pay

**Purpose:** view a quote, approve it, pay deposit/final invoice via Apple Pay.

**Route:** `/project/[id]/invoice/[invoice_id]`

**Layout:**
- Nav bar: title "{Kind} invoice"
- Hero block:
  - "Total" `type/caption` `text/tertiary`
  - Amount: `£XXX.XX` `type/display`
  - "Includes 20% VAT" `type/footnote` `text/secondary` (or "VAT not charged" if tradesman not VAT-registered)
- Line items list (clean rows, qty × price → total)
- VAT line
- Total line, emphasised
- Notes from tradesman (italic, `text/secondary`)
- Sticky bottom bar:
  - PrimaryButton: "Pay £XXX.XX with Apple Pay" (full width)
  - GhostButton above: "Ask a question" (opens chat with pre-filled message)

**Payment flow:** Stripe PaymentSheet — Apple Pay sheet appears via native bridge. On success, confetti is *not* used. A soft success state with green check + "Payment sent to Dave. Receipt emailed." Toast for the actual confirmation. No interruption.

**States:** draft (tradesman editing — customer can't see), sent (this view), paid (badge "Paid" with date), overdue (`status/delayed` badge + soft chase line — never aggressive).

### D.5 [Customer] Onboarding (Invite Acceptance)

**Purpose:** convert SMS invite into an active customer in under 60 seconds.

**Route:** initial deep-link `/invite/{code}` → onboarding stack

**Screens (5 max):**

1. **Welcome (1 screen):** Hero text "Sarah, welcome to your kitchen project with Smith Builders." Below: tradesman avatar, business name, verified badge if applicable. PrimaryButton: "Get started". GhostButton: "Not Sarah? Tap here."

2. **Sign in:** Apple / Google / Email. Apple as primary (top, full-width PrimaryButton). Google secondary. Email tertiary (text link).

3. **Phone confirm:** "Confirm your mobile so Dave can reach you" — pre-filled from invite. SMS code field. (Auto-fill works on iOS via OTP autofill.)

4. **Notifications permission:** Custom pre-prompt screen *before* the iOS dialog: "Get gentle updates when Dave posts. We'll never send marketing." PrimaryButton: "Turn on updates" → triggers iOS permission. SecondaryButton: "Maybe later".

5. **Done — into project:** Brief success screen with sparkle haptic, then auto-routes to project detail (D.1).

**No paywalls. No marketing. No tutorials.** The customer should land on their project as fast as possible.

### D.6 [Tradesman] Dashboard

**Purpose:** the tradesman's home screen. Their day at a glance.

**Route:** `/` (when role = tradesman)

**Layout:**

1. **Greeting card** (top)
   - "Morning, Dave" / "Afternoon, Dave" / "Evening, Dave"
   - "{n} jobs on the go · {m} need an update"
   - Small CTA chip: "Post update" (PrimaryButton compact)

2. **Today's plan** (if any jobs marked "On site today" — V1; in MVP it's just upcoming list)
   - Card per job: avatar + customer name + project title + status badge
   - Tap → project detail

3. **Active projects list**
   - Filterable: All / On track / Delayed / Needs update
   - Each row:
     - Avatar (32) + customer name (`type/body-lg-emphasis`)
     - Project title + status badge
     - Last update timestamp ("Updated 2h ago" / "Hasn't been updated in 3 days" in `destructive/text` if > 3 days)
     - Trailing: chevron
   - Cards alternate visual emphasis to highlight stale projects (subtle outline + `bg/surface-2`)

4. **Quick actions** (sticky bottom or FAB)
   - FAB: `+` `Plus` → "Post update" (camera-first action sheet)
   - OR: large "+" tab in tab bar (recommended — see C section icon list)

**Empty state:** "Start your first project to see it here." Single PrimaryButton: "New project".

### D.7 [Tradesman] Create Update — *the highest-leverage flow in the app*

**Purpose:** post a daily update in under 30 seconds. Camera-first.

**Route:** `+` tab → modal

**Flow (camera-first):**

1. Tab "+ Update" → app opens **direct to camera** (full-screen native camera UI via `expo-image-picker` or `expo-camera`)
2. Take 1–6 photos (multi-select sheet built in)
3. Tap "Next" → compose screen:
   - Photos as horizontal scroll (each tappable to remove)
   - Voice note button: large round, holds to record. Releases → live transcription appears in body field.
   - Body text field: editable, prefilled with transcription if voice used
   - Optional: project picker (defaults to last-active project)
   - Optional: milestone selector — checkbox row "Mark milestone complete: Plastering"
   - "Notify customer" toggle (default ON, prominent)
4. Sticky bottom: PrimaryButton "Post". Press → upload starts immediately, navigates back to dashboard, toast "Update sent ✓" within 3 seconds.

**Optimistic UI:** the update appears in the local timeline immediately on tap. If upload fails, banner: "Update didn't send — Retry" + the original card stays in the feed with a "retry" indicator.

**Designed-for-speed details:**
- Camera default to back-facing
- Flash auto
- Photo grid pre-selected mode (multi-select on by default)
- Voice button is *huge* (88pt diameter) — Dave's gloves on, dirty hands, etc.
- No required fields
- Defaults: last project, "notify on", milestone "none"

### D.8 [Tradesman] Project Detail

**Purpose:** richer view than customer's, with editing power.

**Differences from D.1:**
- Status badge is tappable → BottomSheet to change status with reason input
- Hero card shows "{Customer name}" not the project title (the customer IS the project for the tradesman)
- Timeline shows all events including reactions/comments from customer
- Floating action button: + Update (camera-first, scoped to this project)
- Edit project details (address, dates, milestones)
- Invoice tab: tradesman can create new invoices, see paid/unpaid
- "Mark complete" → final screen for confirmation, triggers invoice + review prompt to customer

**Status change BottomSheet:**
- List of status options as large radio-style rows
- If selecting `delayed`: required "Reason" selector + optional voice note + "New ETA" date picker
- The composed message previews at the bottom ("Your customer will see: ...") in a soft card
- PrimaryButton: "Send update"

### D.9 [Tradesman] Quote / Invoice Creation

**Purpose:** create a quote or invoice, send to customer for approval/payment.

**Route:** `/project/[id]/invoice/new`

**Layout:**
- Type selector (segmented): Quote · Deposit · Invoice · Final
- Customer (read-only from project)
- Date (defaults today)
- Line items list — add row, each with description / qty / unit price / total
- VAT toggle (on if tradesman VAT-registered) — auto-shows VAT line
- Totals box (subtotal, VAT, total) sticky at top of section
- Notes field
- Attach PDF (optional — if they have their own quote doc, upload it instead)
- Sticky bottom: PrimaryButton "Send to {customer name}". Confirms in a sheet "Send for £XXX.XX?".

**On send:** push notification to customer, status updates, tradesman sees confirmation.

### D.10 [Tradesman] Profile & Verification

**Purpose:** the tradesman's tradesman-facing settings; also drives customer trust signals.

**Route:** `/profile` tab

**Sections (ListRow groups):**

1. **Profile card** (top)
   - Avatar (80), business name (`type/title-2`), trade (`type/body`, `text/secondary`)
   - Verified badge if verified
   - Rating: ★ 4.8 (24 reviews)

2. **Business**
   - Photo / logo (`Replace`)
   - Business name
   - Bio (200 chars)
   - Trades (multi-select)
   - Service areas (UK postcode list)
   - Years trading

3. **Verification** — UK-specific, drives trust
   - Phone (verified ✓ / Verify now)
   - Gas Safe number (with link "Look up at gassaferegister.co.uk")
   - NICEIC number
   - Insurance: provider + expiry + upload certificate
   - CSCS card upload
   - **Manual review state:** "Sent for verification — usually 24h"

4. **Payments** (Stripe Connect)
   - Setup state, payouts, balance, recent payouts list

5. **Subscription** (V1+) — current plan, upgrade

6. **Settings** — notifications, account, sign out, delete account

### D.11 [Customer] Updates tab (was: Notifications)

**Purpose:** a calm, single-stream feed that answers the question *"what's happened on my project recently?"* without requiring the customer to dig through chat or the timeline.

**Route:** `/updates` tab (customer)

**Layout:**
- Nav bar: title "Updates", no back button (it's a tab)
- A single vertically-scrolling feed, mixing 4 entry kinds:
  - `Card.Update` (timeline updates — text + photos)
  - `EventPill` (arrived/left/milestone events)
  - `SystemRow` (status changes, invoice sent, payment received)
  - `Card.Invoice` (compact preview when an invoice is delivered)
- Grouped by day with sticky day header (`type/caption` `text/tertiary` — "TODAY", "YESTERDAY", "TUESDAY 14 MAY")
- Pull-to-refresh; new items animate in with `motion/spring/snappy`

**Empty state:** "You'll see every update from {tradesman} here. Your first one usually lands within 24 hours."

**Realtime:** subscribed to the project channel. New events animate in from the top.

**Why this is a tab, not a bell icon:** the Updates feed *is* the product for the customer. Putting it behind a 16pt bell icon trivialises the very thing that justifies the app's existence. A full tab signals: "this is where you live."

### D.12 [Tradesman/Apprentice] End-of-Day Update (the leave-site nudge target)

**Purpose:** convert a push tap into a sent update in under 20 seconds. The single highest-leverage screen in the app for the core insight.

**Route:** deep-link `tradesmenapp.uk/eod/{nudge_id}` — opens directly from push notification, presents as a modal sheet over wherever the user was

**Component:** `EndOfDayCard` (spec at C.18)

**Behaviour:**
- Sheet detent: `medium` (covers ~70% of screen) — leaves a peek of the underlying app to feel non-modal
- Auto-focus on the body text field with cursor at end (so they can append, not retype)
- Photo affordance opens the native camera (back-facing) immediately on tap — no intermediate sheet
- Voice note: long-press the mic, release to attach, transcript appears as appendable text
- Sending: optimistic — sheet dismisses immediately on tap, sync happens in background
- On offline: stays in send queue, banner shows "Will send when you're back"

**Success state:** brief sparkle haptic + Toast "Update sent to {customer}" at the bottom of the screen the user returns to.

**If dismissed without sending:** silently dismisses, but `nudges.dismissed_at` is recorded. The follow-up 8pm nudge will fire if no other update arrives before then.

### D.13 [All personas] Location Consent Screen

**Purpose:** explain *why* we use location, in plain English, before triggering the iOS permission dialog. Lifting consent rates from ~30% (cold prompt) to >70% (warm prompt).

**Route:** appears once during onboarding, again on settings request

**Layout:**

1. **Hero illustration** (SF Symbol, 64pt, `brand/primary` tint): `location.circle.fill`
2. **Title** (`type/title-1`): "Help your customer feel calm"
   - Apprentice variant: "Help {lead_name} keep the team coordinated"
   - Customer variant: "Mark your home as the project location"
3. **Body** (`type/body-lg`):
   - Tradesman: *"With your permission, we'll automatically tell {customer_first_name} when you arrive and when you wrap up for the day. Nothing else is shared — no live tracking, no map of your van, no data sold."*
   - Apprentice: *"With your permission, your lead can see you're on site and your hours are logged automatically. You can switch this off any time."*
   - Customer: *"This marks your address as the spot where 'arrived' events should be tied to. You're not being tracked — only the people working on your project are."*
4. **Three reassurance rows** (each 56pt high, leading SF Symbol, body text):
   - `checkmark.shield` — "Used only for arrival and leave-site events"
   - `eye.slash` — "Your customer never sees a live map"
   - `slider.horizontal.3` — "Turn off any time from Account"
5. **Sticky bottom:**
   - PrimaryButton (52pt): "Turn on" → triggers iOS dialog
   - GhostButton above: "Maybe later" → writes `consent_records` as denied, surfaces a one-line banner in Project tab nudging to enable later

**Critical:** the iOS native permission dialog is the second step, not the first. The Apple HIG implicitly endorses this pattern.

### D.14 [Tradesman] Crew tab

**Purpose:** a single live view of who's on which site, what they've posted today, and which apprentice updates need approval.

**Route:** `/crew` tab (tradesman)

**Layout (top to bottom):**

1. **Today's crew strip** (horizontal scroll)
   - One card per crew member (apprentices + lead themselves)
   - Avatar, name, current state: `On site at {project}` / `Travelling` / `Off shift`
   - Tap → drills into their day

2. **Pending approvals** (only if any)
   - InlineAlert style with leading icon `clock.badge.exclamationmark`
   - "{n} updates from {apprentice} waiting for you"
   - Tap → review queue

3. **By-project view** (default)
   - Each project as a row: title, status, who's on site now, last update time
   - Stale badge (>3 days no update) in `status/delayed`

4. **FAB:** + Assign apprentice → bottom sheet with apprentice picker + project picker

### D.15 [Apprentice] Today tab

**Purpose:** the apprentice's home. One screen answers: *where am I working, what am I doing, who do I report to?*

**Route:** `/today` tab (apprentice)

**Layout:**

1. **Today card** (top)
   - Project name, address (tap → opens Apple Maps), lead's name + avatar
   - State: "Heading there" / "On site (since 8:14am)" / "Off site"
   - Status pill from the project

2. **Tasks for today** (set by lead, optional)
   - Checklist with `radius/sm` checkboxes, large tap targets
   - Tick → mini-haptic, posts a tiny event to the Crew tab visible to lead

3. **Mini-update composer**
   - Inline 1-tap "Photo" / "Voice" / "Type"
   - Goes to lead by default; can be promoted to customer-bound update which then routes through approval

4. **End of day** (visible after leave-site geofence event)
   - "Anything to flag for {lead_name} before tomorrow?"
   - Same compose surface, pre-filled

### D.16 Shared — Notifications history (was D.11)

**Purpose:** in-app history of push notifications, for catch-up when notifications were dismissed. **Not** a primary surface — the Updates tab is.

**Route:** `/account/notifications` (settings)

**Layout:**
- Unread first, grouped by day
- Each row: SF Symbol matching notification kind, title, body (2 lines max), timestamp, tap → deep links to source
- Mark all as read (top-right button)

**Empty state:** "You're all caught up." with `checkmark.circle` SF Symbol.

> Note: this screen is no longer a top-level tab. It lives under Account → Notifications. The Updates *tab* (D.11) is the customer's primary catch-up surface, sourced from the project event stream rather than the push history.

---

## Part E — Microcopy guidelines

The product's job is reassurance. Copy is the most powerful tool.

### E.1 Voice principles

- **Specific, not generic.** "Dave updated your kitchen project" not "You have a new notification."
- **Calm, not urgent.** Avoid "!" exclamation marks except in error states.
- **Active, not passive.** "Materials arriving Monday" not "Materials are expected to arrive on Monday."
- **Plain, not corporate.** "Tap to pay" not "Proceed to payment."
- **British, not American.** "Booked in", "on site", "fitter", "decorator", "plasterer" — UK trade vocabulary.

### E.2 Critical copy strings

| Where | Copy |
|---|---|
| Splash | (no text — logo only) |
| Customer invite SMS | `Hi {first_name}, {business_name} has set up your {trade_name} project on Tradesmen. See live updates and message {tradesman_first_name}: https://tradesmenapp.uk/i/{code}` |
| First project notification | "Welcome to your project with {tradesman}. Updates will appear here." |
| "On track" status hero | "On track for {end_date}" |
| Delayed status hero | "Slight delay, still on track" (never "Your project is delayed") |
| Empty timeline | "Your first update will appear here." |
| Empty chat | "Say hello — Dave will see this on his phone." |
| Notification permission pre-prompt | "Get gentle updates when {tradesman} posts. We'll never send marketing." |
| Payment processing toast | "Payment sent to {tradesman}." (success), "Payment didn't go through. Tap to retry." (error) |
| 3-day no-update nudge to tradesman | "Quick photo? {Customer} hasn't heard from you in 3 days." |
| **Leave-site nudge (push to tradesman)** | "Heading home? {Customer first name} is waiting on an update. 20 seconds." |
| **Leave-site nudge (push to apprentice)** | "Wrapping up? Quick note for {lead first name} — 20 seconds." |
| **Arrived event (customer push)** | "{Tradesman} arrived on site · {time}" |
| **Left site event (customer push)** | "{Tradesman} wrapped up for today · {time}" — never "Dave has left" (feels abandoning) |
| **EoD card title** | "Quick update for {customer first name}" |
| **EoD card default body** | "Wrapped up for today. Back tomorrow ~{time}." |
| **EoD card success toast** | "Update sent to {customer}." |
| **8pm fallback nudge** | "Quick photo? {Customer} hasn't heard from you today." |
| **Location consent — primary CTA** | "Turn on" (not "Allow", not "Enable") |
| **Location consent — bottom row** | "Used only for arrival and leave-site events" / "Your customer never sees a live map" |
| **Apprentice approval pending notice** | "{Lead first name} will review before {customer} sees it." |
| Project completion to customer | "All done. How was your project?" |
| Review prompt | "Leave a review for {tradesman}" |
| Error generic | "Something went wrong. Tap to retry." (never "An error occurred") |
| Offline banner | "You're offline. We'll send your update when you're back." |

### E.3 Never say
- "Sorry for the inconvenience"
- "Please note"
- "An error has occurred"
- "User"
- "Press" (use "Tap")
- "Click" (mobile only)
- "Are you sure?" (use specific consequence: "Delete this update? It will be removed from {customer}'s timeline.")

---

## Part F — Accessibility (WCAG 2.1 AA)

- **Colour contrast:** all text/bg combinations ≥ 4.5:1 (body) / 3:1 (large text). Status colours validated.
- **Tap targets:** 44×44pt minimum, even when visual element is smaller.
- **Dynamic Type:** support iOS Dynamic Type up to XXXLarge for all text. Layout reflows, never truncates critical content.
- **VoiceOver:** every interactive element has an `accessibilityLabel`. Status badge reads "Project status: on track for Friday." not just "in_progress."
- **Reduce Motion:** when user has Reduce Motion on, all `motion/spring/*` become fades. No parallax.
- **Voice Control / Switch Control:** primary actions are reachable in ≤ 3 hops.
- **Haptics:** never the sole signal. Always paired with visual change.

---

## Part G — Dark mode

Full dark mode parity from day one. Same components, swapped tokens. Specific dark-mode notes:
- Status pill backgrounds are darker / less saturated to avoid "neon" feel
- Photos and media never get a colour-mode treatment
- Shadows replaced with 1pt subtle border (`border/subtle`) — shadows don't work on near-black
- Brand blue stays the same hue but the `brand/tint` darkens to `#0F1F45` for backgrounds

---

## Part H — Component naming convention (Expo / RN)

For when this hands off to engineering:
- All UI atoms in `/components/ui/`: `Button`, `Card`, `StatusBadge`, etc.
- All composed components in `/components/`: `TimelineUpdate`, `ProjectCard`, `ChatBubble`
- Screens in `/app/` (Expo Router): `app/project/[id]/index.tsx`, `app/project/[id]/timeline.tsx`
- Tokens in `/theme/tokens.ts`, derived themes in `/theme/light.ts`, `/theme/dark.ts`
- One styled-component / `StyleSheet` per component file. No global CSS.

---

## Part I — What's NOT in this design system (yet)

- Illustration set (use SF Symbols only in MVP)
- Marketing site styles (separate brand exercise, V1)
- App icon (commission separately, week 10)
- In-app onboarding tour overlays (don't need them — the product should be self-evident)
- Custom fonts (SF Pro is free + native + perfect)
- Charts / data viz (no dashboards in MVP)

---

*Next deliverable: 04 — Interactive iOS Prototype. Will visually demonstrate this design system applied to the hero screens.*
