import { describe, expect, it } from "vitest";

import { FrontmatterError, parseFrontmatter } from "../../src/core/frontmatter.js";

describe("frontmatter parser", () => {
  it("rejects missing opening boundary", () => {
    const source = "name: react-performance-review\n---\nBody";

    expect(() => parseFrontmatter(source)).toThrow(FrontmatterError);
  });

  it("parses valid yaml frontmatter and body", () => {
    const source = [
      "---",
      "name: react-performance-review",
      "description: Reviews React components for avoidable rerenders.",
      "---",
      "# React Performance Review",
      "Use this skill for rerender analysis.",
    ].join("\n");

    const parsed = parseFrontmatter(source);

    expect(parsed.data).toEqual({
      name: "react-performance-review",
      description: "Reviews React components for avoidable rerenders.",
    });
    expect(parsed.body).toBe("# React Performance Review\nUse this skill for rerender analysis.");
  });
});
