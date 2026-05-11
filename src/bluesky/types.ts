/**
 * Bluesky / AT Protocol response shapes for the endpoints we use.
 *
 * Source: https://docs.bsky.app/docs/api
 * Only the fields we read are declared; unknown extras are allowed via index signature.
 */

export interface BskyProfileViewBasic {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  associated?: { chat?: { allowIncoming?: string } };
  labels?: BskyLabel[];
}

export interface BskyLabel {
  src: string;
  uri: string;
  val: string;
  cts: string;
}

export interface BskyPostRecord {
  $type: "app.bsky.feed.post";
  text: string;
  createdAt: string;
  langs?: string[];
  embed?: unknown;
  reply?: {
    root: { uri: string; cid: string };
    parent: { uri: string; cid: string };
  };
  facets?: BskyFacet[];
}

export interface BskyFacet {
  index: { byteStart: number; byteEnd: number };
  features: Array<
    | { $type: "app.bsky.richtext.facet#mention"; did: string }
    | { $type: "app.bsky.richtext.facet#link"; uri: string }
    | { $type: "app.bsky.richtext.facet#tag"; tag: string }
  >;
}

export interface BskyPostView {
  uri: string;
  cid: string;
  author: BskyProfileViewBasic;
  record: BskyPostRecord;
  embed?: BskyEmbedView;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  quoteCount?: number;
  indexedAt: string;
  labels?: BskyLabel[];
  langs?: string[];
}

export type BskyEmbedView =
  | { $type: "app.bsky.embed.images#view"; images: BskyEmbedImage[] }
  | { $type: "app.bsky.embed.external#view"; external: BskyEmbedExternal }
  | { $type: "app.bsky.embed.record#view"; record: unknown }
  | { $type: "app.bsky.embed.recordWithMedia#view"; record: unknown; media: unknown }
  | { $type: "app.bsky.embed.video#view"; cid: string; playlist?: string; thumbnail?: string };

export interface BskyEmbedImage {
  thumb: string;
  fullsize: string;
  alt: string;
  aspectRatio?: { width: number; height: number };
}

export interface BskyEmbedExternal {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

export interface SearchPostsResponse {
  posts: BskyPostView[];
  cursor?: string;
  hitsTotal?: number;
}

export interface FeedViewPost {
  post: BskyPostView;
  reply?: { root: BskyPostView; parent: BskyPostView };
  reason?: { $type: "app.bsky.feed.defs#reasonRepost"; by: BskyProfileViewBasic; indexedAt: string };
}

export interface GetAuthorFeedResponse {
  feed: FeedViewPost[];
  cursor?: string;
}

export interface GetProfileResponse extends BskyProfileViewBasic {
  description?: string;
  followsCount?: number;
  followersCount?: number;
  postsCount?: number;
  indexedAt?: string;
}
