# Setup checklist — getting Claude Code ready

You've already done Node + Expo CLI. Here's everything else, in order.

## 1. Install Claude Code (5 mins)

```bash
npm install -g @anthropic-ai/claude-code
```

Sign in once:

```bash
claude
```

Follow the prompts. You'll authenticate with your Anthropic account.

## 2. Install Xcode (45 mins, mostly download time)

- App Store → search "Xcode" → Install
- Open Xcode once, accept the license
- Open Xcode → Settings → Platforms → install **iOS 18 Simulator** (or latest)
- In Terminal: `xcode-select --install` (command line tools)

You don't need a paid Apple Developer account yet. Free Apple ID is enough until you're ready for TestFlight (~3 weeks in).

## 3. Set up the project folder

```bash
mkdir -p ~/Code/tradesmen-app
cd ~/Code/tradesmen-app
git init
```

Copy these reference files from `~/Documents/Claude/Projects/Tradesmen Uber/` into your new project folder (or keep them open in another window — your call):

- `CLAUDE.md`
- `KICKOFF_PROMPT.md`
- `01_MVP_Product_Strategy_and_Roadmap.md`
- `02_Technical_Architecture_and_DB_Schema.md`
- `03_Design_System_and_Screen_Specs.md`
- `07_Production_Roadmap.md`
- `11_Final_Prototype.html`

A simple `cp` does the trick:

```bash
cp "/Users/tig_todd/Documents/Claude/Projects/Tradesmen Uber/CLAUDE.md" .
cp "/Users/tig_todd/Documents/Claude/Projects/Tradesmen Uber/01_MVP_Product_Strategy_and_Roadmap.md" .
cp "/Users/tig_todd/Documents/Claude/Projects/Tradesmen Uber/02_Technical_Architecture_and_DB_Schema.md" .
cp "/Users/tig_todd/Documents/Claude/Projects/Tradesmen Uber/03_Design_System_and_Screen_Specs.md" .
cp "/Users/tig_todd/Documents/Claude/Projects/Tradesmen Uber/07_Production_Roadmap.md" .
cp "/Users/tig_todd/Documents/Claude/Projects/Tradesmen Uber/11_Final_Prototype.html" .
```

## 4. Open Claude Code in the project folder

```bash
cd ~/Code/tradesmen-app
claude
```

You'll see a chat-style interface in your terminal.

## 5. Paste the kickoff prompt

Open `KICKOFF_PROMPT.md`, copy the prompt between the dashes, paste it into Claude Code. Hit return.

Claude Code will read `CLAUDE.md`, then come back with a plan. Approve it, then watch it scaffold the project.

## 6. Install Supabase CLI (later, when needed)

```bash
brew install supabase/tap/supabase
```

You don't need a Supabase account until you're ready to migrate the schema. The local CLI runs Postgres in Docker for development.

## 7. Get a Supabase account when you're ready (free tier)

[supabase.com](https://supabase.com) → New project → free tier. Save the URL and anon key — you'll paste them into `.env.local`.

---

## What if something goes wrong

- **Claude Code says "permission denied"** → run with `--dangerously-skip-permissions` is one option, or grant the specific permission it asks for. Read what it wants before approving.
- **iOS Simulator won't open** → `xcrun simctl boot "iPhone 16"` from Terminal, or open Xcode → Window → Devices and Simulators
- **`expo start` hangs** → kill it (Ctrl+C), run `npx expo start --clear`
- **Package install fails** → check Node version (`node -v` should be ≥ 18). Reinstall with `nvm` if needed.

## What to do every day

1. `git pull` if you've been working on multiple machines
2. `cd ~/Code/tradesmen-app && claude`
3. Tell Claude what you want to ship today
4. Review every diff before you accept it
5. Commit small, commit often — `feat:`, `fix:`, `chore:` prefixes
6. Push to GitHub at end of session
