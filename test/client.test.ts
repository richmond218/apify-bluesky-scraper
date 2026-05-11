import { describe, it, expect, vi } from "vitest";
import { BlueskyClient, BlueskyApiError } from "../src/bluesky/client.js";
import { SEARCH_RESPONSE_PAGE_1, SEARCH_RESPONSE_PAGE_2, AUTHOR_FEED_RESPONSE } from "./fixtures.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("BlueskyClient.searchPosts", () => {
  it("calls the right URL with query params", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SEARCH_RESPONSE_PAGE_1)) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl });
    await client.searchPosts("climate", { limit: 25, lang: "en", sort: "top" });

    const calls = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls.length).toBe(1);
    const url = String(calls[0]![0]);
    expect(url).toContain("/xrpc/app.bsky.feed.searchPosts");
    expect(url).toContain("q=climate");
    expect(url).toContain("limit=25");
    expect(url).toContain("lang=en");
    expect(url).toContain("sort=top");
  });

  it("clamps limit to [1, 100]", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SEARCH_RESPONSE_PAGE_1)) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl });
    await client.searchPosts("x", { limit: 500 });
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("limit=100");
  });
});

describe("BlueskyClient.iterateSearchPosts", () => {
  it("paginates through cursors and stops when cursor missing", async () => {
    let call = 0;
    const fetchImpl = (async () => {
      call++;
      return jsonResponse(call === 1 ? SEARCH_RESPONSE_PAGE_1 : SEARCH_RESPONSE_PAGE_2);
    }) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl });
    const collected = [];
    for await (const p of client.iterateSearchPosts("test", 100)) {
      collected.push(p);
    }
    // page 1 had 2, page 2 had 3 → 5 total
    expect(collected).toHaveLength(5);
    expect(call).toBe(2);
  });

  it("respects maxItems and stops early", async () => {
    const fetchImpl = (async () => jsonResponse(SEARCH_RESPONSE_PAGE_1)) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl });
    const collected = [];
    for await (const p of client.iterateSearchPosts("test", 1)) {
      collected.push(p);
    }
    expect(collected).toHaveLength(1);
  });

  it("stops if cursor doesn't advance (no infinite loop)", async () => {
    // Some buggy AppViews return the same cursor — make sure we don't loop forever.
    const fetchImpl = (async () => jsonResponse(SEARCH_RESPONSE_PAGE_1)) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl });
    const collected = [];
    for await (const p of client.iterateSearchPosts("test", 100)) {
      collected.push(p);
      if (collected.length > 10) throw new Error("infinite-loop guard tripped");
    }
    // SEARCH_RESPONSE_PAGE_1 has 2 posts and a fixed cursor. We yield page 1 (2),
    // then call again with that cursor, get the same 2 posts back, then detect
    // the stuck cursor on the second response and stop. So 4 max, never infinite.
    expect(collected.length).toBeLessThanOrEqual(4);
  });
});

describe("BlueskyClient.iterateAuthorFeed", () => {
  it("yields feed items", async () => {
    const fetchImpl = (async () => jsonResponse(AUTHOR_FEED_RESPONSE)) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl });
    const collected = [];
    for await (const f of client.iterateAuthorFeed("alice.bsky.social", 100)) {
      collected.push(f);
    }
    expect(collected).toHaveLength(2);
  });
});

describe("BlueskyClient — error handling", () => {
  it("retries 429 then succeeds", async () => {
    let call = 0;
    const fetchImpl = (async () => {
      call++;
      if (call === 1) return new Response("rate limit", { status: 429 });
      return jsonResponse(SEARCH_RESPONSE_PAGE_2);
    }) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl, maxRetries: 2 });
    const res = await client.searchPosts("test");
    expect(res.posts).toHaveLength(3);
    expect(call).toBe(2);
  });

  it("throws BlueskyApiError on 400", async () => {
    const fetchImpl = (async () => new Response("bad query", { status: 400 })) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl });
    await expect(client.searchPosts("test")).rejects.toBeInstanceOf(BlueskyApiError);
  });

  it("fails after maxRetries on persistent 503", async () => {
    const fetchImpl = (async () => new Response("oh no", { status: 503 })) as unknown as typeof fetch;
    const client = new BlueskyClient({ fetchImpl, maxRetries: 1 });
    await expect(client.searchPosts("test")).rejects.toBeInstanceOf(BlueskyApiError);
  });
});
