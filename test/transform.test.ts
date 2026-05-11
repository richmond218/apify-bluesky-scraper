import { describe, it, expect } from "vitest";
import { transformPost, postUriToWebUrl, extractPostFromFeed } from "../src/transform.js";
import {
  POST_PLAIN,
  POST_REPLY,
  POST_WITH_IMAGE,
  POST_WITH_LINK,
  POST_WITH_MENTION,
  FEED_REGULAR,
  FEED_REPOST,
} from "./fixtures.js";

describe("postUriToWebUrl", () => {
  it("constructs the canonical bsky.app URL", () => {
    const url = postUriToWebUrl(
      "at://did:plc:abc123/app.bsky.feed.post/3kabcdef",
      "alice.bsky.social",
    );
    expect(url).toBe("https://bsky.app/profile/alice.bsky.social/post/3kabcdef");
  });

  it("falls back to profile URL on malformed URI", () => {
    const url = postUriToWebUrl("at://malformed", "alice.bsky.social");
    expect(url).toBe("https://bsky.app/profile/alice.bsky.social");
  });
});

describe("transformPost — basic fields", () => {
  it("maps plain post fields", () => {
    const out = transformPost(POST_PLAIN, { mode: "search", query: "test" });
    expect(out.uri).toBe(POST_PLAIN.uri);
    expect(out.author_handle).toBe("alice.bsky.social");
    expect(out.text).toContain("Hello Bluesky");
    expect(out.like_count).toBe(42);
    expect(out.repost_count).toBe(7);
    expect(out.is_reply).toBe(false);
    expect(out.source_mode).toBe("search");
    expect(out.source_query).toBe("test");
  });

  it("includes scraped_at as a valid ISO string", () => {
    const out = transformPost(POST_PLAIN, { mode: "search", query: "test" });
    expect(out.scraped_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Number.isNaN(Date.parse(out.scraped_at))).toBe(false);
  });

  it("extracts hashtag facets", () => {
    const out = transformPost(POST_PLAIN, { mode: "search", query: "test" });
    expect(out.hashtags).toEqual(["atproto"]);
  });
});

describe("transformPost — reply detection", () => {
  it("marks reply posts and captures root/parent", () => {
    const out = transformPost(POST_REPLY, { mode: "search", query: "test" });
    expect(out.is_reply).toBe(true);
    expect(out.reply_root_uri).toBe(POST_PLAIN.uri);
    expect(out.reply_parent_uri).toBe(POST_PLAIN.uri);
  });
});

describe("transformPost — embeds", () => {
  it("flags media for image embed and captures images array", () => {
    const out = transformPost(POST_WITH_IMAGE, { mode: "search", query: "test" });
    expect(out.has_media).toBe(true);
    expect(out.has_video).toBe(false);
    expect(out.embed_images).toHaveLength(1);
    expect(out.embed_images[0]?.alt).toContain("orange sky");
  });

  it("flags external_link for external embed and captures URL/title", () => {
    const out = transformPost(POST_WITH_LINK, { mode: "search", query: "test" });
    expect(out.has_external_link).toBe(true);
    expect(out.embed_external_url).toBe("https://atproto.com/specs/xrpc");
    expect(out.embed_external_title).toContain("XRPC");
  });

  it("extracts link facets independent of external embed", () => {
    const out = transformPost(POST_WITH_LINK, { mode: "search", query: "test" });
    expect(out.links).toContain("https://atproto.com/specs/xrpc");
  });
});

describe("transformPost — facets", () => {
  it("extracts mention DIDs", () => {
    const out = transformPost(POST_WITH_MENTION, { mode: "search", query: "test" });
    expect(out.mentions).toEqual(["did:plc:abc123"]);
  });
});

describe("extractPostFromFeed", () => {
  it("regular post is not a repost", () => {
    const r = extractPostFromFeed(FEED_REGULAR);
    expect(r.is_repost).toBe(false);
    expect(r.reposted_by_handle).toBeUndefined();
  });

  it("detects repost and captures reposter handle", () => {
    const r = extractPostFromFeed(FEED_REPOST);
    expect(r.is_repost).toBe(true);
    expect(r.reposted_by_handle).toBe("reposter.bsky.social");
  });
});
