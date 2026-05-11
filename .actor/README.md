# Bluesky Posts & Profiles Scraper

> Apify Actor that scrapes [Bluesky](https://bsky.app) via the public AT Protocol API. Search posts by query, fetch posts from specific authors, optionally enrich each post with Claude-powered sentiment / topic / entity / summary fields.

No Bluesky account required. The AT Protocol exposes public read endpoints at `https://public.api.bsky.app` — this Actor uses only those, so there's no auth setup beyond Apify itself.

## What you get per scraped post

Every output item is a flat object with these fields (see [`src/types.ts`](src/types.ts) for the full Zod schema):

```json
{
  "uri": "at://did:plc:abc.../app.bsky.feed.post/3kxyz",
  "cid": "bafyrei...",
  "url": "https://bsky.app/profile/alice.bsky.social/post/3kxyz",
  "text": "Hello Bluesky! …",
  "language": ["en"],

  "author_did": "did:plc:abc...",
  "author_handle": "alice.bsky.social",
  "author_display_name": "Alice",

  "like_count": 42,
  "repost_count": 7,
  "reply_count": 3,
  "quote_count": 1,

  "created_at": "2026-05-10T12:00:00.000Z",
  "indexed_at": "2026-05-10T12:00:01.000Z",

  "is_reply": false,
  "reply_root_uri": null,
  "reply_parent_uri": null,

  "has_media": true,
  "has_external_link": false,
  "has_video": false,
  "embed_images": [{"url": "https://...", "alt": "An orange sky"}],
  "embed_external_url": null,
  "embed_external_title": null,

  "mentions": ["did:plc:..."],
  "links": ["https://..."],
  "hashtags": ["atproto"],
  "labels": [],

  "semantic": {
    "sentiment": "positive",
    "topics": ["climate", "policy"],
    "entities": [{"name": "COP30", "kind": "event"}],
    "summary": "Short auto-generated summary."
  },

  "source_mode": "search",
  "source_query": "climate change",
  "scraped_at": "2026-05-11T05:14:00.000Z"
}
```

`semantic` only appears when `enrich_with_claude` is on.

## Modes

### Mode `search` — by query

```json
{
  "mode": "search",
  "search_query": "climate change OR climatechange",
  "sort": "latest",
  "language": "en",
  "max_items": 500
}
```

Uses [`app.bsky.feed.searchPosts`](https://docs.bsky.app/docs/api/app-bsky-feed-search-posts) under the hood. Supports `OR`, quoted phrases, and hashtag queries.

### Mode `author_feed` — by user

```json
{
  "mode": "author_feed",
  "actors": ["bsky.app", "atproto.com", "alice.bsky.social"],
  "author_filter": "posts_no_replies",
  "max_items_per_actor": 200,
  "max_items": 1000
}
```

Calls [`app.bsky.feed.getAuthorFeed`](https://docs.bsky.app/docs/api/app-bsky-feed-get-author-feed) once per actor in the list, with cursor-based pagination.

## Optional: Claude enrichment

Toggle `enrich_with_claude: true` and provide an Anthropic API key. Each post then gets a `semantic` field added before being pushed to the dataset.

You choose which fields to compute (cheaper subsets cost less):

```json
{
  "enrich_with_claude": true,
  "claude_api_key": "sk-ant-…",
  "claude_model": "claude-haiku-4-5",
  "enrichment_fields": {
    "sentiment": true,
    "topics": true,
    "entities": false,
    "summary": false
  }
}
```

Posts are batched (10 per call) so you pay roughly **$0.002 per 10 posts** at Haiku 4.5 rates with sentiment + topics on.

If enrichment fails for any reason (rate limit, malformed model response, network), the batch falls through unchanged — the run never fails because of optional enrichment.

## Local development

```bash
git clone https://github.com/<your-username>/apify-bluesky-scraper
cd apify-bluesky-scraper
npm install
npm run build
npm test                # 27 unit tests, ~2s
```

## Pushing to Apify Store

```bash
npm install -g apify-cli
apify login              # browser auth
apify push               # uploads source + builds the Actor on Apify Cloud
```

After the build succeeds, open the Actor in Apify Console:
1. Fill in **seoTitle** and **seoDescription** (this is the main discoverability lever — see Apify Store guidance)
2. Set **pricing model**: PAY_PER_EVENT recommended at `$0.003/post` (matches the leading competitor's tier)
3. Publish under the **Publication** tab

## Cost model (per Apify run)

| Volume | Bluesky API calls | Apify compute | Claude calls (optional) | Total Apify cost |
|---|---|---|---|---|
| 100 posts | ~1-2 | 256 MB · ~10s | 0-10 | ~$0.001 |
| 1,000 posts | ~10 | 256 MB · ~60s | 0-100 | ~$0.005 |
| 10,000 posts | ~100 | 512 MB · ~10min | 0-1,000 | ~$0.05 |

The Bluesky public API has no documented hard rate limit but is empirically rate-friendly at ~100 requests/min from a single IP. The Actor's built-in retry+backoff handles 429s automatically.

## Why this Actor

Bluesky has 30M+ users, the AT Protocol is open, but tooling lags — the leading scraper on Apify Store has fewer than 500 installs. This one is:

- **Fully open** — MIT licensed, every transform in `src/transform.ts` is auditable
- **Test-covered** — 27 unit tests with mocked Bluesky responses, no flaky integration suite
- **LLM-ready** — optional Claude enrichment makes posts useful for brand monitoring, sentiment dashboards, and RAG ingestion without an additional pipeline
- **Cheap by default** — pay-per-event pricing means small runs cost cents, not dollars

## Project structure

```
.actor/
├── actor.json              # Apify Actor metadata (categories, dataset views, memory limits)
├── input_schema.json       # Console UI input form definition
└── Dockerfile              # Apify Cloud build
src/
├── main.ts                 # Actor entry — orchestrates search/feed → transform → push
├── input.ts                # Zod-validated Input schema mirroring input_schema.json
├── types.ts                # ScrapedPost output schema
├── transform.ts            # BskyPostView → ScrapedPost mapper (handles embeds, facets, reposts)
├── bluesky/
│   ├── client.ts           # XRPC fetch client with retry+backoff and paginated iterators
│   └── types.ts            # Bluesky response shapes
└── enrichment/
    └── claude.ts           # Optional batched Claude enrichment
test/
├── fixtures.ts             # Sample Bluesky responses (plain post, reply, image, link, mention, repost)
├── transform.test.ts       # 12 tests
├── client.test.ts          # 9 tests
└── input.test.ts           # 6 tests
```

## License

MIT — see [LICENSE](LICENSE).
