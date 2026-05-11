# Bluesky Scraper — Setup & Apify Store publish guide

What you need to do to take this from "code on GitHub" to "earning money on Apify Store." Everything else is built.

---

## Current state

✅ Done:
- 5 source files (~700 LOC TypeScript)
- 27 unit tests passing
- `.actor/{actor.json, input_schema.json, Dockerfile}` ready for `apify push`
- README + LICENSE + .gitignore
- Pushed to GitHub: https://github.com/richmond218/apify-bluesky-scraper

🟡 Waiting on you:
1. Create Apify account (5 min)
2. `apify login` (2 min)
3. `apify push` (~3 min cloud build)
4. Fill in **seoTitle + seoDescription** on Apify Console (10 min — this is the biggest revenue lever)
5. Set pricing model (5 min)
6. Connect Stripe Connect for payouts (10 min, one-time)
7. Toggle "Publish to Store" (1 min)

**Total your time: ~35 min one-time setup. Then passive.**

---

## Step 1 — Apify account

Go to https://apify.com → "Sign up" (free tier gives you 10,000 monthly credits, plenty for testing). GitHub OAuth signup is fastest.

Note your username — it becomes part of your Actor URL (e.g. `apify.com/<your-username>/bluesky-scraper`).

## Step 2 — Install Apify CLI

```bash
npm install -g apify-cli
apify --version       # should show 1.x or 2.x
```

## Step 3 — `apify login`

```bash
cd ~/work/03-portfolio/apify-bluesky-scraper
apify login
```

Opens a browser, you confirm, CLI stores the token locally.

## Step 4 — `apify push` (first deploy)

```bash
apify push
```

This:
1. Reads `.actor/actor.json` for metadata
2. Builds the Docker image on Apify Cloud (~3 min first time)
3. Creates the Actor in your account (still private — not on Store yet)
4. Returns a console URL for the Actor

You can also use `apify run` locally to test the Actor against a real input — it executes `src/main.ts` against Apify's local storage, so you can validate the scrape works before publishing.

## Step 5 — Configure for the Store (this is where the money comes from)

Open the Actor's page in https://console.apify.com.

### 5a. SEO fields (the single biggest revenue lever)

Per the Apify demand-scan, **most Actors fail because devs skip seoTitle / seoDescription**. The Apify Store search is driven by these fields. Make them read like Google search results, not like a GitHub repo name.

Recommended values (paste verbatim):

**Actor name** (URL slug — keep short):
```
bluesky-scraper
```

**Title** (displayed prominently):
```
Bluesky Posts & Profiles Scraper — Search Posts, Get Author Feeds, Optional AI Enrichment
```

**SEO Title** (meta title, ~60 chars):
```
Bluesky Posts & Profiles Scraper | AT Protocol API Scraper
```

**SEO Description** (meta description, ~155 chars):
```
Scrape Bluesky posts by query or by author handle via the AT Protocol public API. No auth required. Optional Claude AI sentiment, topic, and entity enrichment.
```

**Description (the body of the listing)** — paste your `README.md` content, lightly edited to remove dev-focused install steps.

### 5b. Categories

In the Console: **Categories** → select all three:
- `Social media`
- `Marketing`
- `Developer tools`

This is set in `.actor/actor.json` already but verify it persisted to the Store listing.

### 5c. Pricing model

**Pricing tab** → **Pay per event** → add this event schedule (per the demand-scan recommendation, matches the strongest competitor pricing):

| Event | Display name | Price per event ($) |
|---|---|---|
| `Actor start` | Actor start | 0.10 |
| `Each scraped post` | Per scraped post | 0.003 |
| `Each enriched post` (optional event) | Per Claude-enriched post | 0.001 |

Save. Apify takes 20% — you keep 80%.

> If you want to charge less aggressively for the first month to build install velocity, drop "Per scraped post" to $0.001. You can raise prices anytime; existing users keep their old tier.

### 5d. Stripe Connect (one-time, for payouts)

In Console: **Settings → Billing → Payouts**. Click "Connect Stripe" — go through the standard Stripe Connect onboarding (KYC, bank account, tax info). Apify pays out monthly once your balance crosses ~$10-50 depending on region.

## Step 6 — Publish to Store

Open the Actor → **Publication** tab → toggle "Public" → toggle "Listed in Apify Store" → Save.

Within 1-3 hours it appears in the Apify Store search.

## Step 7 — Drive first installs

Apify Store has organic search, but discovery for new Actors is slow. To accelerate:

1. **Comment on the Reddit threads where Bluesky scraper demand was identified** (r/apify, r/dataisbeautiful, r/socialmedia) with your Actor link — only when relevant, not spammy
2. **Cross-post your Actor link on Bluesky itself** — find people complaining about scraping cost/setup
3. **Reference it in any dev.to / Hashnode article you write** about Bluesky / scraping
4. **Link from the GitHub repo's About section** — your repo is at https://github.com/richmond218/apify-bluesky-scraper

## Step 8 — Monitor + iterate

In Apify Console → **Stats** → see runs per day, revenue, errors.

If errors > 5%:
- Most common: Bluesky API rate limits (handled by retry+backoff, should be rare)
- Second most: Claude API failures (handled by graceful degradation)
- Third: Input validation failures from users — improve the input schema descriptions

The Actor's structured logs (via `Actor.log`) will appear in the run-detail view automatically.

---

## Revenue math (reminder of the upside)

Per Apify demand scan estimates:
- $800-$2,000/month at 150k posts/month from ~50 active users
- Free Apify tier sustains ~50k posts of testing before pricing kicks in
- Realistic first-month revenue (after Store discovery ramp): $20-$100, growing 30-50% MoM with no additional work

---

## If you hit a blocker

Common issues:

| Symptom | Fix |
|---|---|
| `apify push` fails on Docker build | Run `npm run build` locally first to catch TS errors; the cloud build runs the same `npm run build` |
| Actor crashes on first run with `cannot find module 'apify'` | Make sure `package.json` has `"type": "module"` and `npm install` ran cleanly |
| Bluesky API returns 403 from Apify | Add an Apify proxy in `.actor/actor.json` `proxy.useApifyProxy = true` |
| No enrichment fields appearing | Check `enrich_with_claude` is `true` AND `claude_api_key` is set |
| Bad input schema rendering | Compare `.actor/input_schema.json` against your Console's preview — sometimes `editor: stringList` needs `default: []` to render the "Add row" button |

Ping me with the error and the run-ID and I'll diagnose.
