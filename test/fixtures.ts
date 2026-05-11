import type { BskyPostView, FeedViewPost, GetAuthorFeedResponse, SearchPostsResponse } from "../src/bluesky/types.js";

export const POST_PLAIN: BskyPostView = {
  uri: "at://did:plc:abc123/app.bsky.feed.post/3kabcdef",
  cid: "bafyrei...",
  author: {
    did: "did:plc:abc123",
    handle: "alice.bsky.social",
    displayName: "Alice",
    avatar: "https://cdn.bsky.app/img/avatar/plain/did:plc:abc123/avatar.jpeg",
  },
  record: {
    $type: "app.bsky.feed.post",
    text: "Hello Bluesky! This is my first post. #atproto",
    createdAt: "2026-05-10T12:00:00.000Z",
    langs: ["en"],
    facets: [
      {
        index: { byteStart: 47, byteEnd: 55 },
        features: [{ $type: "app.bsky.richtext.facet#tag", tag: "atproto" }],
      },
    ],
  },
  likeCount: 42,
  repostCount: 7,
  replyCount: 3,
  quoteCount: 1,
  indexedAt: "2026-05-10T12:00:01.000Z",
};

export const POST_REPLY: BskyPostView = {
  uri: "at://did:plc:def456/app.bsky.feed.post/3kghijkl",
  cid: "bafyrei2...",
  author: { did: "did:plc:def456", handle: "bob.bsky.social", displayName: "Bob" },
  record: {
    $type: "app.bsky.feed.post",
    text: "Good point, alice!",
    createdAt: "2026-05-10T12:05:00.000Z",
    reply: {
      root: { uri: POST_PLAIN.uri, cid: POST_PLAIN.cid },
      parent: { uri: POST_PLAIN.uri, cid: POST_PLAIN.cid },
    },
  },
  likeCount: 2,
  repostCount: 0,
  replyCount: 0,
  indexedAt: "2026-05-10T12:05:01.000Z",
};

export const POST_WITH_IMAGE: BskyPostView = {
  uri: "at://did:plc:img789/app.bsky.feed.post/3kmnopqr",
  cid: "bafyrei3...",
  author: { did: "did:plc:img789", handle: "photographer.bsky.social" },
  record: {
    $type: "app.bsky.feed.post",
    text: "Sunset over the bay tonight",
    createdAt: "2026-05-10T19:00:00.000Z",
  },
  embed: {
    $type: "app.bsky.embed.images#view",
    images: [
      {
        thumb: "https://cdn.bsky.app/thumb.jpg",
        fullsize: "https://cdn.bsky.app/full.jpg",
        alt: "An orange sky reflected on the water",
        aspectRatio: { width: 1600, height: 900 },
      },
    ],
  },
  likeCount: 100,
  indexedAt: "2026-05-10T19:00:01.000Z",
};

export const POST_WITH_LINK: BskyPostView = {
  uri: "at://did:plc:link/app.bsky.feed.post/3ksomelink",
  cid: "bafylink",
  author: { did: "did:plc:link", handle: "newsuser.bsky.social" },
  record: {
    $type: "app.bsky.feed.post",
    text: "Interesting article on AT Protocol",
    createdAt: "2026-05-10T15:00:00.000Z",
    facets: [
      {
        index: { byteStart: 0, byteEnd: 32 },
        features: [
          {
            $type: "app.bsky.richtext.facet#link",
            uri: "https://atproto.com/specs/xrpc",
          },
        ],
      },
    ],
  },
  embed: {
    $type: "app.bsky.embed.external#view",
    external: {
      uri: "https://atproto.com/specs/xrpc",
      title: "HTTP API (XRPC) — AT Protocol",
      description: "Specification for XRPC over HTTP.",
    },
  },
  indexedAt: "2026-05-10T15:00:01.000Z",
};

export const POST_WITH_MENTION: BskyPostView = {
  uri: "at://did:plc:mention/app.bsky.feed.post/3kmention",
  cid: "bafymention",
  author: { did: "did:plc:mention", handle: "mentioner.bsky.social" },
  record: {
    $type: "app.bsky.feed.post",
    text: "@alice.bsky.social check this out",
    createdAt: "2026-05-10T16:00:00.000Z",
    facets: [
      {
        index: { byteStart: 0, byteEnd: 18 },
        features: [{ $type: "app.bsky.richtext.facet#mention", did: "did:plc:abc123" }],
      },
    ],
  },
  indexedAt: "2026-05-10T16:00:01.000Z",
};

export const SEARCH_RESPONSE_PAGE_1: SearchPostsResponse = {
  posts: [POST_PLAIN, POST_WITH_IMAGE],
  cursor: "page2-cursor",
  hitsTotal: 5,
};

export const SEARCH_RESPONSE_PAGE_2: SearchPostsResponse = {
  posts: [POST_WITH_LINK, POST_WITH_MENTION, POST_REPLY],
  // no cursor — pagination done
};

export const FEED_REGULAR: FeedViewPost = { post: POST_PLAIN };
export const FEED_REPOST: FeedViewPost = {
  post: POST_PLAIN,
  reason: {
    $type: "app.bsky.feed.defs#reasonRepost",
    by: { did: "did:plc:reposter", handle: "reposter.bsky.social" },
    indexedAt: "2026-05-11T00:00:00.000Z",
  },
};

export const AUTHOR_FEED_RESPONSE: GetAuthorFeedResponse = {
  feed: [FEED_REGULAR, FEED_REPOST],
};
