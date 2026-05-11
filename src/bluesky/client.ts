import type {
  GetAuthorFeedResponse,
  GetProfileResponse,
  SearchPostsResponse,
} from "./types.js";

export type AuthorFeedFilter =
  | "posts_with_replies"
  | "posts_no_replies"
  | "posts_with_media"
  | "posts_and_author_threads";

export interface BlueskyClientOptions {
  /** Override base URL (default: https://public.api.bsky.app). */
  baseUrl?: string;
  /** Override fetch (for tests). */
  fetchImpl?: typeof fetch;
  /** User-Agent header. Apify rotates UA via its infra; this is just identification. */
  userAgent?: string;
  /** Max retries on 429/5xx. Default 3. */
  maxRetries?: number;
}

/**
 * Minimal AT Protocol XRPC client for unauthenticated reads against the
 * public Bluesky AppView (https://public.api.bsky.app).
 *
 * Endpoints used:
 *   - app.bsky.feed.searchPosts
 *   - app.bsky.feed.getAuthorFeed
 *   - app.bsky.actor.getProfile
 *
 * Authenticated endpoints (writes, private feeds) are NOT supported.
 */
export class BlueskyClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
  private readonly maxRetries: number;

  constructor(opts: BlueskyClientOptions = {}) {
    this.baseUrl = opts.baseUrl ?? "https://public.api.bsky.app";
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    this.userAgent = opts.userAgent ?? "apify-bluesky-scraper/0.1 (+https://apify.com)";
    this.maxRetries = opts.maxRetries ?? 3;
  }

  /**
   * app.bsky.feed.searchPosts — query-based post search.
   * @param q  Search query string.
   * @param opts.limit  1-100; default 25.
   * @param opts.cursor  Pagination cursor from previous response.
   * @param opts.lang  Language filter (BCP-47, e.g. "en").
   * @param opts.sort  "top" | "latest"; default "latest".
   * @param opts.since  ISO datetime — only posts after this.
   * @param opts.until  ISO datetime — only posts before this.
   */
  async searchPosts(
    q: string,
    opts: {
      limit?: number;
      cursor?: string;
      lang?: string;
      sort?: "top" | "latest";
      since?: string;
      until?: string;
    } = {},
  ): Promise<SearchPostsResponse> {
    const params = new URLSearchParams({ q });
    if (opts.limit !== undefined) params.set("limit", String(Math.min(100, Math.max(1, opts.limit))));
    if (opts.cursor) params.set("cursor", opts.cursor);
    if (opts.lang) params.set("lang", opts.lang);
    if (opts.sort) params.set("sort", opts.sort);
    if (opts.since) params.set("since", opts.since);
    if (opts.until) params.set("until", opts.until);
    return this.get<SearchPostsResponse>("app.bsky.feed.searchPosts", params);
  }

  /**
   * app.bsky.feed.getAuthorFeed — posts by a single user.
   * @param actor  Handle (e.g. "bsky.app") or DID.
   */
  async getAuthorFeed(
    actor: string,
    opts: {
      limit?: number;
      cursor?: string;
      filter?: AuthorFeedFilter;
    } = {},
  ): Promise<GetAuthorFeedResponse> {
    const params = new URLSearchParams({ actor });
    if (opts.limit !== undefined) params.set("limit", String(Math.min(100, Math.max(1, opts.limit))));
    if (opts.cursor) params.set("cursor", opts.cursor);
    if (opts.filter) params.set("filter", opts.filter);
    return this.get<GetAuthorFeedResponse>("app.bsky.feed.getAuthorFeed", params);
  }

  /**
   * app.bsky.actor.getProfile — full profile for a handle or DID.
   */
  async getProfile(actor: string): Promise<GetProfileResponse> {
    return this.get<GetProfileResponse>(
      "app.bsky.actor.getProfile",
      new URLSearchParams({ actor }),
    );
  }

  /**
   * Iterator helper: paginate through all results of searchPosts up to maxItems.
   * Yields one BskyPostView at a time. Stops on empty cursor or maxItems reached.
   */
  async *iterateSearchPosts(
    q: string,
    maxItems: number,
    opts: { lang?: string; sort?: "top" | "latest"; since?: string; until?: string } = {},
  ): AsyncGenerator<SearchPostsResponse["posts"][number]> {
    let cursor: string | undefined;
    let yielded = 0;
    while (yielded < maxItems) {
      const pageSize = Math.min(100, maxItems - yielded);
      const res = await this.searchPosts(q, { ...opts, cursor, limit: pageSize });
      if (res.posts.length === 0) return;
      for (const p of res.posts) {
        yield p;
        yielded++;
        if (yielded >= maxItems) return;
      }
      if (!res.cursor || res.cursor === cursor) return;
      cursor = res.cursor;
    }
  }

  /** Iterator helper for getAuthorFeed. */
  async *iterateAuthorFeed(
    actor: string,
    maxItems: number,
    opts: { filter?: AuthorFeedFilter } = {},
  ): AsyncGenerator<GetAuthorFeedResponse["feed"][number]> {
    let cursor: string | undefined;
    let yielded = 0;
    while (yielded < maxItems) {
      const pageSize = Math.min(100, maxItems - yielded);
      const res = await this.getAuthorFeed(actor, { ...opts, cursor, limit: pageSize });
      if (res.feed.length === 0) return;
      for (const f of res.feed) {
        yield f;
        yielded++;
        if (yielded >= maxItems) return;
      }
      if (!res.cursor || res.cursor === cursor) return;
      cursor = res.cursor;
    }
  }

  private async get<T>(endpoint: string, params: URLSearchParams): Promise<T> {
    const url = `${this.baseUrl}/xrpc/${endpoint}?${params.toString()}`;
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.fetchImpl(url, {
          headers: { "User-Agent": this.userAgent, Accept: "application/json" },
        });

        if (res.status === 429 || res.status >= 500) {
          if (attempt < this.maxRetries) {
            const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
            await sleep(retryAfter ?? exponentialBackoff(attempt));
            continue;
          }
          throw new BlueskyApiError(`Bluesky ${endpoint} returned ${res.status} after ${attempt + 1} attempts`, res.status);
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          throw new BlueskyApiError(
            `Bluesky ${endpoint} returned ${res.status}: ${errBody.slice(0, 200)}`,
            res.status,
          );
        }

        return (await res.json()) as T;
      } catch (err) {
        lastError = err as Error;
        if (err instanceof BlueskyApiError && err.status !== undefined && err.status < 500 && err.status !== 429) {
          throw err;
        }
        if (attempt >= this.maxRetries) throw lastError;
        await sleep(exponentialBackoff(attempt));
      }
    }
    throw lastError ?? new Error("Unreachable retry loop");
  }
}

export class BlueskyApiError extends Error {
  override name = "BlueskyApiError";
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function exponentialBackoff(attempt: number): number {
  return Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}
