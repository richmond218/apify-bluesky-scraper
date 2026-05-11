import type { BskyPostView, FeedViewPost } from "./bluesky/types.js";
import type { ScrapedPost } from "./types.js";

/** Convert at:// URI to the canonical https:// view URL. */
export function postUriToWebUrl(uri: string, handle: string): string {
  // at://did:plc:.../app.bsky.feed.post/<rkey>
  const match = uri.match(/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([^/]+)$/);
  if (!match || !match[1]) return `https://bsky.app/profile/${handle}`;
  return `https://bsky.app/profile/${handle}/post/${match[1]}`;
}

/** Map a Bluesky PostView to our flat output schema. */
export function transformPost(
  post: BskyPostView,
  source: {
    mode: "search" | "author_feed";
    query?: string;
    actor?: string;
  },
): ScrapedPost {
  const record = post.record;
  const reply = record.reply;

  const mentions: string[] = [];
  const links: string[] = [];
  const hashtags: string[] = [];
  for (const facet of record.facets ?? []) {
    for (const feature of facet.features) {
      switch (feature.$type) {
        case "app.bsky.richtext.facet#mention":
          mentions.push(feature.did);
          break;
        case "app.bsky.richtext.facet#link":
          links.push(feature.uri);
          break;
        case "app.bsky.richtext.facet#tag":
          hashtags.push(feature.tag);
          break;
      }
    }
  }

  // Embed inspection
  let has_media = false;
  let has_external_link = false;
  let has_video = false;
  const embed_images: ScrapedPost["embed_images"] = [];
  let embed_external_url: string | undefined;
  let embed_external_title: string | undefined;
  if (post.embed) {
    switch (post.embed.$type) {
      case "app.bsky.embed.images#view":
        has_media = true;
        for (const img of post.embed.images) {
          embed_images.push({ url: img.fullsize, alt: img.alt });
        }
        break;
      case "app.bsky.embed.external#view":
        has_external_link = true;
        embed_external_url = post.embed.external.uri;
        embed_external_title = post.embed.external.title;
        break;
      case "app.bsky.embed.video#view":
        has_video = true;
        has_media = true;
        break;
      case "app.bsky.embed.recordWithMedia#view":
        has_media = true;
        break;
    }
  }

  return {
    uri: post.uri,
    cid: post.cid,
    url: postUriToWebUrl(post.uri, post.author.handle),
    text: record.text,
    language: record.langs ?? post.langs,

    author_did: post.author.did,
    author_handle: post.author.handle,
    author_display_name: post.author.displayName,
    author_avatar: post.author.avatar,

    like_count: post.likeCount ?? 0,
    repost_count: post.repostCount ?? 0,
    reply_count: post.replyCount ?? 0,
    quote_count: post.quoteCount ?? 0,

    created_at: record.createdAt,
    indexed_at: post.indexedAt,

    is_reply: Boolean(reply),
    reply_root_uri: reply?.root.uri,
    reply_parent_uri: reply?.parent.uri,

    has_media,
    has_external_link,
    has_video,
    embed_images,
    embed_external_url,
    embed_external_title,

    mentions,
    links,
    hashtags,
    labels: (post.labels ?? []).map((l) => l.val),

    source_mode: source.mode,
    source_query: source.query,
    source_actor: source.actor,
    scraped_at: new Date().toISOString(),
  };
}

/** Extract the inner PostView from a FeedViewPost (handles reposts vs originals). */
export function extractPostFromFeed(item: FeedViewPost): {
  post: BskyPostView;
  is_repost: boolean;
  reposted_by_handle?: string;
} {
  if (item.reason?.$type === "app.bsky.feed.defs#reasonRepost") {
    return {
      post: item.post,
      is_repost: true,
      reposted_by_handle: item.reason.by.handle,
    };
  }
  return { post: item.post, is_repost: false };
}
