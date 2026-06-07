# Phase — Ship checklist

Everything you need to get Phase live on the App Store. Copy-paste ready.

---

## 0 — Right now (5 minutes)

```bash
npm install -g eas-cli       # the Expo build/submit CLI
eas login                    # use the same Expo account that owns the project
```

If `eas login` says you're not the project owner, you're already in. Skip.

---

## 1 — Apple Developer Program enrolment (start TODAY — 24-48h wait)

1. Go to **https://developer.apple.com/programs/enroll/**
2. Sign in with your Apple ID (create one if needed — use a real personal/business email, not a throwaway)
3. Choose **Individual** (£79/yr) or **Organization** (£99/yr, needs a DUNS number for a UK Ltd. company)
4. Pay. Apple emails you a confirmation. 24-48h later, your account is provisioned.

While you wait, do steps 2-4 below.

---

## 2 — App Store listing copy (paste this when prompted)

### App name
```
Phase
```

### Subtitle (30 char max)
```
The build, shared.
```

### Promotional text (170 char, can change without resubmitting)
```
Updates, photos and the day's work — straight to your customer, before you leave site.
```

### Description (4,000 char max)
```
Phase is the private workspace for a UK home-improvement project — kitchens, bathrooms, extensions, full refurbs. It sits between the tradesperson running the build and the homeowner paying for it, for the life of the job.

It's not a directory, not a quote-shopping site, not a way to find trades. Phase exists after the contract is signed. The lead invites their customer. From that moment, both of them share a single source of truth for the project.

WHAT'S INSIDE

• A daily timeline — text, photos, voice notes
• A schedule with editable milestones
• A snag list — flag, resolve with proof, sign off
• A document tray for quotes, certificates and plans
• Private chat between the homeowner and the lead
• A crew layer — apprentices' updates queue for the lead's sign-off before reaching the customer
• Push notifications + a notifications inbox

THE LEAVE-SITE NUDGE

When the lead leaves a project address, Phase gently reminds them to send a one-line end-of-day update. Two taps, ten seconds. The customer gets it before the lead has reached the motorway. No-one is left wondering what happened today.

WHO IT'S FOR

• Lead tradespeople running jobs worth £5k+
• Apprentices working alongside a lead
• Homeowners commissioning a build and tired of chasing for updates

WHO IT'S NOT FOR

• Tradespeople looking for new leads — Phase doesn't do that
• Customers looking to compare quotes — try a directory site
• Anyone who wants a slick marketing facade — Phase is honest, plain and useful

PRIVATE BY DESIGN

Phase has no public profiles, no public directory, no public search. Your project is invite-only and stays private. Location is checked only when you leave a site you're already on — never streamed, never tracked continuously.

Built in Britain. Plain English. Sentence case. £.
```

### Keywords (100 char, comma-separated)
```
builder,renovation,construction,project,tradesman,plumber,electrician,kitchen,bathroom,extension
```

### Support URL
Easiest: hosted Notion page. Title: "Phase — Support". Body:
```
For help, email hello@tigrowth.com (or your support email).
We aim to reply within one business day.
```
Set the page to public, copy the share URL.

### Marketing URL (optional)
Skip for V1.

### Privacy Policy URL
**Required**. See §4 below — I've drafted one.

### Category
Primary: **Productivity**
Secondary: **Business**

### Age rating
4+

### Copyright
```
© 2026 TIG Digital
```

---

## 3 — Screenshots (capture from your simulator)

In the iOS Simulator with Phase running:
- File → Save Screen → saves a PNG to your Desktop
- Or Cmd+S (same thing)

Take 5 screenshots that tell the story:
1. **Welcome screen** — Phase logo + "We'll never leave you wondering"
2. **Customer project home** — hero card showing status + today
3. **End-of-day card** with photo attached
4. **Schedule (Gantt)** with a few coloured bars
5. **A snag** mid-resolution — clear value-prop visual

Apple requires these in **iPhone 6.7" inch** (1290×2796 px). The iPhone 17 sim already gives you the right resolution if you crop to the home indicator boundary. Don't worry about other sizes — App Store auto-scales 6.7" screenshots for older phones.

You can upload them in App Store Connect → My App → App Store tab → Screenshots.

---

## 4 — Privacy Policy (host this somewhere)

Copy the markdown below into a public Notion page (set page → Share → Publish to web), then paste the share URL into App Store Connect's Privacy Policy URL field.

```
# Phase — Privacy Policy

Last updated: 7 June 2026

This is the privacy policy for Phase ("we", "us", "our"), the iOS app published by TIG Digital. It explains what data we collect, why, and what we do with it.

## 1. What we collect

When you create an account:
- Your name, email and phone number
- A profile photo if you upload one

When you use Phase on a project:
- Text and photos you post as project updates
- Voice notes you record on end-of-day cards
- Comments and chat messages you send
- Documents you upload to a project
- Snags you flag, including any photos attached
- Your milestone dates, project status and other project metadata

When you grant permission, with your explicit consent:
- "When in Use" location — used solely to detect when you leave a project address and prompt for an end-of-day update. Phase never streams or stores your continuous location.
- Push notification tokens — used to deliver project notifications.

When you tap to record audio or capture photos, we access your microphone and camera. Phase only writes the recorded files to your project at your explicit instruction.

## 2. Why we collect it

Everything Phase collects exists to make a shared project workspace work. We do not sell, rent or share your data with third parties for advertising. We do not profile you, do not infer attributes about you, and do not use your data to train any AI model.

## 3. Where it lives

Data is stored on Supabase (a hosted Postgres + Storage provider) in the EU-West-2 region. Push tokens are forwarded to Expo's push service. SMS invites you send go through Twilio. Each of these is bound by their own privacy policy and acts as a processor on our behalf.

## 4. Who sees it

Project data is visible only to the other people on that project — the lead tradesperson, their customer, and any apprentices/helpers they've added to the crew. Nothing is public. Phase has no public profiles, no public directory, no search.

## 5. How long we keep it

We keep your data for as long as your account is active. If you delete your account, we delete your profile and any data only you control within 30 days. Project data that is shared with another participant is retained for them, anonymised on your side.

## 6. Your rights (UK GDPR)

You can request a copy, correction or deletion of your data at any time by emailing the support address below. We will respond within 30 days.

## 7. Children

Phase is not directed at children under 13 and we do not knowingly collect data from them.

## 8. Changes

We will post any material change to this policy in-app and update the date above.

## 9. Contact

For privacy questions, email hello@tigrowth.com.

TIG Digital
United Kingdom
```

**Hosting it:** the fastest path is a Notion page. Create a new page, paste this in, click Share → Publish to web, copy the URL. That URL is what goes into App Store Connect.

---

## 5 — Once Apple provisions you

You'll get an email from Apple. Then:

### A. Find your three identifiers

Go to **https://developer.apple.com/account** → Membership.
- **Team ID** — 10-character string. Copy it.
- **Apple ID** — your account email.

### B. Create the App Store Connect record

Go to **https://appstoreconnect.apple.com** → My Apps → +.
- Platform: **iOS**
- Name: **Phase**
- Primary language: **English (UK)**
- Bundle ID: select **com.tigdigital.phase** (this becomes selectable after Apple registers the bundle on your account — Expo does this on the first `eas build`)
- SKU: any unique string, e.g. `phase-202606`

After you create the record, the URL shows an **App ID** — a 10-digit number after `/apps/`. Copy that — it's your `ascAppId`.

### C. Fill the three placeholders in eas.json

Edit `~/Desktop/tradesmen-app/eas.json` — `submit.production.ios`:

```json
{
  "appleId": "your-apple-id@example.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABCDEFGH12"
}
```

Commit:
```bash
cd ~/Desktop/tradesmen-app
git add eas.json
git commit -m "chore: real Apple credentials in eas.json"
git push
```

---

## 6 — Build it

```bash
cd ~/Desktop/tradesmen-app
eas build --platform ios --profile production
```

This:
- Runs on Expo's servers (you don't need Xcode locally for the build)
- Prompts you to log into your Apple account on the first run (only once)
- Generates an `.ipa` file
- Takes 15-20 minutes

When it finishes, the terminal prints a build URL. Click it — you'll see the build status in Expo's web dashboard.

---

## 7 — Submit it

```bash
eas submit --platform ios --profile production
```

This uploads the `.ipa` to App Store Connect's TestFlight section.

After 5-10 minutes, you'll see the build appear in:
**App Store Connect → Phase → TestFlight tab**

---

## 8 — Internal TestFlight beta

In App Store Connect → TestFlight:
1. Add yourself as an **Internal Tester**
2. Install **TestFlight** on your phone
3. Accept the invite that arrives by email
4. Install Phase, test it on your real device

Add 3-5 real tradespeople and their customers as **External Testers** (requires a brief description for Apple's review — they review external builds in ~24h). Get feedback.

---

## 9 — Submit for App Store review

When you're happy:
**App Store Connect → Phase → App Store tab → Submit for Review**

Apple typically responds within 24-48 hours.

If approved → you can choose to release immediately or schedule. Phase goes live worldwide (or just UK if you prefer — set it in **Pricing and Availability**).

---

## Cheat sheet — total time budget

| Step | Elapsed |
|---|---|
| Apple Developer enrolment | 24-48h |
| Privacy policy + listing copy + screenshots | 2-3h of your time |
| eas build | 15-20 min |
| eas submit | 5-10 min |
| TestFlight beta | as long as you want |
| Apple review | 24-48h |
| **Total best-case** | **~3-4 days** |
| **Total realistic with a week of beta** | **~10-14 days** |
