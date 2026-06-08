# Phase — Privacy Policy

*Last updated: 8 June 2026 · Effective: 8 June 2026*

Phase is an iOS app that helps a tradesman, their crew, and the customer share what's happening on a UK home-improvement project. This policy explains what data we collect, why we collect it, who we share it with, and what you can ask us to do with it.

Phase is invite-only. We do not advertise, we do not sell data, and we do not run an algorithmic feed. We collect what we need to make the app work — and nothing else.

## 1. Who we are

Phase is operated by **Phase LTD**, a company incorporated in England and Wales (Companies House number: `[to add once registered]`). For the purposes of UK GDPR and the Data Protection Act 2018, Phase LTD is the **data controller**.

You can contact us about anything in this policy at **t.bullions@gmail.com**.

## 2. What data we collect, and why

### Account information

- **Email and password** (or your Apple/Google login token) — to sign you in.
- **Your name** — so others on a project know who you are.
- **Your role** (customer, tradesman, apprentice) — to show the right screens.
- **Optional avatar photo** — for your profile.

### Project content you choose to share

- Project title, address, and milestones you create.
- Updates, photos, and voice notes you post to a project.
- Messages you send in a project chat.
- Documents and snag reports you upload.
- Reactions and comments on updates.

This content is only visible to participants of that specific project (the tradesman, their crew, and the customer who joined via invite code).

### Location data — tradesman side only

With your permission, Phase uses your iPhone's location **only while the app is in use** (iOS "When in Use" permission). We do not run continuous background tracking, we do not maintain a live map of your whereabouts, and we never share your location with the customer.

Location is used exclusively for one feature: when you cross the geofence around your active project site, we ask whether you'd like to send an end-of-day update to the customer. The event recorded is just the timestamp of the boundary crossing — no coordinates outside the site.

### Tradesman business information

If you sign up as a tradesman, you may choose to add business and credential information to your public-within-Phase profile:

- Business name, trade type, years trading, areas covered.
- Bio and website.
- Certificates you hold (Gas Safe, NICEIC, CSCS, Part P, etc.) — including number, issue date, expiry date, and an optional photo of the card for verification.
- Public liability insurance provider and expiry.
- VAT number and UTR — kept private; **never shown to customers**.

### Phone numbers — for inviting customers only

When a tradesman invites a customer by SMS, we collect and process the customer's phone number to deliver the invite text via Twilio. We don't keep the number after the customer has accepted the invite or after the code expires.

### Notifications

With your permission, we register your iPhone for push notifications via Apple Push Notification service (APNs) and Expo Push. The push token doesn't identify you to anyone outside the project participants.

### Analytics and error reporting

We use a small amount of product analytics (PostHog) and error reporting (Sentry) to understand which features work and to fix bugs.

- Analytics events are anonymised (no personal content) and tied to a generated ID, not your name or email.
- Error reports include the device model, OS version, and a stack trace of the failure. They do not include the content of your messages, photos, or chats.

## 3. Who we share data with

The only organisations that ever see your data are our processors — companies we pay to provide infrastructure:

| Processor | What they do | Where data is stored |
|-----------|--------------|----------------------|
| Supabase | Hosts our database, file storage, and authentication. | EU (Frankfurt). |
| Apple | Delivers push notifications via APNs. | Apple's global infrastructure. |
| Expo | Relays push notifications to Apple's APNs. | USA (with SCC safeguards). |
| Twilio | Sends invite SMS to UK phone numbers. | USA / UK regional infrastructure. |
| PostHog | Anonymised product analytics. | EU. |
| Sentry | Anonymised crash reporting. | EU. |

We do **not** share your data with advertisers, brokers, or anyone else.

## 4. How long we keep your data

- **Active accounts and project content:** for as long as your account is open.
- **Closed accounts:** deleted within 30 days of closure, except where we are legally required to retain records (e.g. accounting).
- **Invite codes and customer phone numbers used for SMS invites:** deleted on acceptance, or after the code expires (30 days).
- **Geofence events:** retained for 12 months for the leave-site nudge to work and so we can fix bugs.
- **Anonymised analytics:** retained for 24 months.
- **Error reports:** retained for 90 days.

## 5. Your rights under UK GDPR

You have the right to:

- **Access** the data we hold about you.
- **Correct** any inaccurate data.
- **Delete** your account and all associated personal data ("right to be forgotten").
- **Restrict** how we process your data.
- **Object** to processing where we're relying on legitimate interest.
- **Port** your data to another service in a machine-readable format.
- **Withdraw consent** for anything you've previously agreed to (e.g. push notifications, location, marketing emails).

To exercise any of these, email **t.bullions@gmail.com**. We'll respond within 30 days. You can also delete your account directly from the Account tab inside the Phase app.

If we don't resolve your concern, you can complain to the UK's data protection regulator, the Information Commissioner's Office, at [ico.org.uk/make-a-complaint](https://ico.org.uk/make-a-complaint/).

## 6. Children

Phase is not intended for anyone under 18. We do not knowingly collect data from children. If you believe a child has signed up, please email us and we'll delete the account.

## 7. International transfers

Most of our processors host data within the UK or EU. Where data is transferred outside the UK (e.g. Apple's global APNs infrastructure, Expo's US servers), it is protected by Standard Contractual Clauses (SCCs) or the UK Addendum, in line with UK GDPR.

## 8. Security

We protect your data with:

- HTTPS encryption for all traffic between your phone and our servers.
- Row-level security in our database: a customer cannot see another customer's project, a tradesman cannot see another tradesman's chat.
- Signed URLs for file access: photos and documents can only be retrieved by someone who is an active project participant.
- Industry-standard password hashing (Supabase Auth, using bcrypt-equivalent).
- Periodic third-party security review of our codebase and database access policies.

No system is perfectly secure. If you become aware of a vulnerability, please email us at **t.bullions@gmail.com**.

## 9. Cookies and tracking

The Phase iOS app does not use cookies. We do not use any third-party advertising or tracking SDKs (no Facebook SDK, no Google Ads, no AppsFlyer, etc.). The only identifiers we generate are tied to your Phase account.

## 10. Changes to this policy

If we change this policy in a way that materially affects your rights or how your data is used, we'll let you know inside the app and update the "Last updated" date at the top of this page. Continuing to use Phase after a change means you accept the new policy.

---

*Phase LTD · Companies House number `[to add once registered]` · Contact: t.bullions@gmail.com*
