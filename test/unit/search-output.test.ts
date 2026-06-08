import { describe, expect, it } from "vitest";

import { searchSkills } from "../../src/core/search.js";

describe("search output", () => {
  it("returns why_matched without full body", () => {
    const results = searchSkills("database migration", [
      {
        name: "database-review",
        description: "Reviews database migrations.",
        body: "Sensitive long body content that must not be returned.",
        headings: ["Migration Review"],
        managed_path: "/tmp/skills/database-review/SKILL.md",
        warnings_at_import: [],
      },
    ]);

    const match = results.at(0);

    expect(match?.why_matched).toContain("description:migration");
    expect(match).not.toHaveProperty("body");
    expect(match).not.toHaveProperty("content");
  });
});
