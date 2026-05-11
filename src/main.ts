import { Actor, log } from "apify";

import { BlueskyClient } from "./bluesky/client.js";
import { enrichPosts } from "./enrichment/claude.js";
import { InputSchema, type Input } from "./input.js";
import { transformPost, extractPostFromFeed } from "./transform.js";
import type { ScrapedPost } from "./types.js";

await Actor.init();

const rawInput = (await Actor.getInput()) ?? {};
const parsed = InputSchema.safeParse(rawInput);
if (!parsed.success) {
  log.error("Invalid Actor input", { issues: parsed.error.issues });
  await Actor.exit({ exitCode: 1, statusMessage: "Invalid input — see Actor log" });
  throw new Error("Invalid input"); // unreachable; satisfies TS
}
const input: Input = parsed.data;

const client = new BlueskyClient({
  userAgent: "apify-bluesky-scraper/0.1 (+https://github.com/richmond218/apify-bluesky-scraper)",
});

const posts: ScrapedPost[] = [];

try {
  if (input.mode === "search") {
    log.info(`Mode: search — query="${input.search_query!}"`);
    const opts: Parameters<BlueskyClient["iterateSearchPosts"]>[2] = { sort: input.sort };
    if (input.language !== undefined) opts.lang = input.language;
    if (input.since !== undefined) opts.since = input.since;
    if (input.until !== undefined) opts.until = input.until;
    for await (const p of client.iterateSearchPosts(input.search_query!, input.max_items, opts)) {
      posts.push(transformPost(p, { mode: "search", query: input.search_query! }));
      if (posts.length % 25 === 0) log.info(`  scraped ${posts.length}/${input.max_items}`);
    }
  } else {
    log.info(`Mode: author_feed — ${input.actors.length} actor(s)`);
    for (const actor of input.actors) {
      let perActor = 0;
      for await (const feedItem of client.iterateAuthorFeed(actor, input.max_items_per_actor, {
        filter: input.author_filter,
      })) {
        const { post } = extractPostFromFeed(feedItem);
        posts.push(transformPost(post, { mode: "author_feed", actor }));
        perActor++;
        if (posts.length >= input.max_items) break;
      }
      log.info(`  ${actor}: ${perActor} posts`);
      if (posts.length >= input.max_items) break;
    }
  }

  log.info(`Scraped ${posts.length} posts total.`);

  if (input.enrich_with_claude && input.claude_api_key) {
    log.info(`Enriching with Claude (${input.claude_model})...`);
    const enriched = await enrichPosts(posts, {
      ...input.enrichment_fields,
      apiKey: input.claude_api_key,
      model: input.claude_model,
    });
    await Actor.pushData(enriched);
  } else {
    await Actor.pushData(posts);
  }

  log.info(`Pushed ${posts.length} items to dataset.`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  log.error(`Run failed: ${msg}`);
  if (posts.length > 0) {
    log.info(`Saving ${posts.length} partial results before exit.`);
    await Actor.pushData(posts);
  }
  await Actor.exit({ exitCode: 1, statusMessage: msg });
  throw err;
}

await Actor.exit({ statusMessage: `OK — ${posts.length} posts scraped` });
