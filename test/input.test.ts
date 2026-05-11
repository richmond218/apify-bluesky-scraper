import { describe, it, expect } from "vitest";
import { InputSchema } from "../src/input.js";

describe("InputSchema validation", () => {
  it("accepts minimal search input", () => {
    const r = InputSchema.safeParse({ mode: "search", search_query: "climate" });
    expect(r.success).toBe(true);
  });

  it("rejects search mode without search_query", () => {
    const r = InputSchema.safeParse({ mode: "search" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("search_query"))).toBe(true);
    }
  });

  it("accepts author_feed mode with actors", () => {
    const r = InputSchema.safeParse({ mode: "author_feed", actors: ["bsky.app"] });
    expect(r.success).toBe(true);
  });

  it("rejects author_feed mode with empty actors", () => {
    const r = InputSchema.safeParse({ mode: "author_feed", actors: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("actors"))).toBe(true);
    }
  });

  it("rejects enrich_with_claude without API key", () => {
    const r = InputSchema.safeParse({
      mode: "search",
      search_query: "x",
      enrich_with_claude: true,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("claude_api_key"))).toBe(true);
    }
  });

  it("applies defaults", () => {
    const r = InputSchema.parse({ mode: "search", search_query: "x" });
    expect(r.sort).toBe("latest");
    expect(r.max_items).toBe(100);
    expect(r.max_items_per_actor).toBe(100);
    expect(r.enrich_with_claude).toBe(false);
    expect(r.claude_model).toBe("claude-haiku-4-5");
  });
});
