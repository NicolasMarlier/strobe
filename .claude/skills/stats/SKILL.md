---
name: stats
description: How Strobe is doing — the website's visits (Vercel Web Analytics) and the installer's downloads per version (GitHub releases). Use when the user asks for Strobe's stats, numbers, audience, visits, downloads or traffic.
---

# Strobe's stats

Talk to the user in French.

1. Run `bin/stats` from the app repo (`/Users/nicolasmarlier/perso/strobe`), or `bin/stats <days>` when the user asks about another period than the last 30 days.
2. Summarize what matters, briefly:
   - Downloads: the total, the current version's, and how many since the last time the user asked if this conversation knows it.
   - Visits: visitors and page views over the period, the trend (rising, falling, a spike on a given day and where it came from), the top referrers and countries.
   - The ratio of downloads to visitors when both are there, as a rough conversion.
3. Keep the caveats in mind and say them when they change the reading: GitHub counts every download, the maintainer's and bots' included, and only in total (no per-day history); Vercel counts visitors without cookies, and ad blockers hide some of them.

When a section says "Unavailable", say why and how to fix it:
- No Vercel token: the user creates one at https://vercel.com/account/tokens, then stores it themselves with `! security add-generic-password -a "$USER" -s strobe-vercel-token -w` (it prompts for the token, which never goes through the conversation). Never ask them to paste it in the chat.
- A 403 or 404 from Vercel: the project may belong to a team: `STROBE_VERCEL_TEAM=<team slug> bin/stats`.
- gh not logged in: `! gh auth login`.

Installs and real usage (unique installs, active users, shows opened, playbacks, MainStage connections) are in the TelemetryDeck dashboard, https://dashboard.telemetrydeck.com, not in `bin/stats`: TelemetryDeck's API needs a paid plan, and Strobe is on the free one. Point the user there when they ask about installs or usage, and remind them that only the released app counts: runs from source go to Test Mode.
