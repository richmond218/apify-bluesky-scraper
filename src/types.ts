import { z } from "zod";

/** Output item pushed to Apify dataset for each Bluesky post. */
export const ScrapedPostSchema = z.object({
  uri: z.string().describe("at:// URI of the post"),
  cid: z.string().describe("Content identifier (CID)"),
  url: z.string().describe("https:// URL viewable in browser"),
  text: z.string(),
  language: z.array(z.string()).optional(),

  // Author
  author_did: z.string(),
  author_handle: z.string(),
  author_display_name: z.string().optional(),
  author_avatar: z.string().optional(),

  // Engagement
  like_count: z.number().int().nonnegative().default(0),
  repost_count: z.number().int().nonnegative().default(0),
  reply_count: z.number().int().nonnegative().default(0),
  quote_count: z.number().int().nonnegative().default(0),

  // Timestamps
  created_at: z.string().describe("Author-claimed ISO timestamp"),
  indexed_at: z.string().describe("Bluesky-AppView-indexed ISO timestamp"),

  // Reply context
  is_reply: z.boolean().default(false),
  reply_root_uri: z.string().optional(),
  reply_parent_uri: z.string().optional(),

  // Embeds
  has_media: z.boolean().default(false),
  has_external_link: z.boolean().default(false),
  has_video: z.boolean().default(false),
  embed_images: z.array(z.object({ url: z.string(), alt: z.string() })).default([]),
  embed_external_url: z.string().optional(),
  embed_external_title: z.string().optional(),

  // Facets
  mentions: z.array(z.string()).default([]).describe("Mentioned handles or DIDs"),
  links: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),

  // Labels (Bluesky moderation labels)
  labels: z.array(z.string()).default([]),

  // Optional semantic enrichment (only set when --enrich is on)
  semantic: z
    .object({
      sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
      topics: z.array(z.string()).optional(),
      entities: z.array(z.object({ name: z.string(), kind: z.string() })).optional(),
      summary: z.string().optional(),
    })
    .optional(),

  // Source metadata
  source_mode: z.enum(["search", "author_feed"]),
  source_query: z.string().optional(),
  source_actor: z.string().optional(),
  scraped_at: z.string().describe("ISO timestamp when this Actor scraped the post"),
});
export type ScrapedPost = z.infer<typeof ScrapedPostSchema>;
