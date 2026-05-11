import { z } from "zod";

/** Input schema for the Apify Actor — mirrors `.actor/input_schema.json`. */
export const InputSchema = z
  .object({
    mode: z.enum(["search", "author_feed"]).default("search"),

    // Search mode
    search_query: z.string().optional().describe('Query for searchPosts, e.g. "climate change OR climatechange"'),
    sort: z.enum(["top", "latest"]).default("latest"),
    language: z.string().optional().describe('BCP-47 code, e.g. "en"; omit to allow any.'),
    since: z.string().optional().describe("ISO datetime — only posts after this"),
    until: z.string().optional().describe("ISO datetime — only posts before this"),

    // Author feed mode
    actors: z.array(z.string()).default([]).describe('Bluesky handles (e.g. "bsky.app") or DIDs'),
    author_filter: z
      .enum([
        "posts_with_replies",
        "posts_no_replies",
        "posts_with_media",
        "posts_and_author_threads",
      ])
      .default("posts_with_replies"),

    // Limits
    max_items: z.number().int().positive().default(100).describe("Hard cap on total posts scraped"),
    max_items_per_actor: z.number().int().positive().default(100),

    // Enrichment
    enrich_with_claude: z.boolean().default(false),
    claude_api_key: z.string().optional(),
    claude_model: z
      .enum(["claude-haiku-4-5", "claude-sonnet-4-6", "claude-opus-4-7"])
      .default("claude-haiku-4-5"),
    enrichment_fields: z
      .object({
        sentiment: z.boolean().default(true),
        topics: z.boolean().default(true),
        entities: z.boolean().default(false),
        summary: z.boolean().default(false),
      })
      .default({ sentiment: true, topics: true, entities: false, summary: false }),
  })
  .superRefine((input, ctx) => {
    if (input.mode === "search" && !input.search_query) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "search_query is required when mode='search'",
        path: ["search_query"],
      });
    }
    if (input.mode === "author_feed" && input.actors.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "actors must contain at least one handle/DID when mode='author_feed'",
        path: ["actors"],
      });
    }
    if (input.enrich_with_claude && !input.claude_api_key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "claude_api_key is required when enrich_with_claude=true",
        path: ["claude_api_key"],
      });
    }
  });
export type Input = z.infer<typeof InputSchema>;
