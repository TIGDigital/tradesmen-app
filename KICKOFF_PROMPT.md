# First prompt to paste into Claude Code

Copy everything between the dashes below into Claude Code as your very first message after opening the project folder.

---

Read `CLAUDE.md` first. That's your orientation.

We're starting from zero. Goal for this session: scaffold the Expo + TypeScript project, set up Supabase locally, get a "hello world" iOS simulator running with the design tokens loaded from `03_Design_System_and_Screen_Specs.md`.

Specifically:

1. Run `npx create-expo-app@latest . --template blank-typescript` in this folder (it's empty)
2. Install the dependencies the architecture doc calls for: Expo Router, Zustand, TanStack Query, Supabase JS client, expo-location, expo-notifications, expo-haptics, react-native-reanimated, expo-image, expo-camera
3. Set up the folder structure described in `CLAUDE.md` (Expo Router groups for auth/tradesman/customer/apprentice)
4. Create `/theme/tokens.ts` — port every design token from `03_Design_System_and_Screen_Specs.md` Part B (colors, typography, spacing, radius, motion, haptics, status colors). Use the exact hex values from the spec.
5. Create a Supabase project structure locally with `supabase init` and write the first migration from `02_Technical_Architecture_and_DB_Schema.md` § 2.2 (enums only — `user_role`, `trade_type`, `project_status`, etc.)
6. Build one demo screen: `/app/index.tsx` showing the Customer Project home (referenced in `11_Final_Prototype.html` — the `#c-project` screen). Use the StatusBadge, project hero, and event-pill components. Hard-code the data for now.
7. Get it running in iOS Simulator via `npx expo start --ios`

Show me your plan before you start writing code. List the files you'll create, in order. Wait for me to approve before running anything that installs packages or scaffolds.

Don't add features beyond what I've listed. Don't suggest Stripe, web app, Android, or marketing site. Strategy doc 01 has those deliberately deferred — V1 or never.

---
