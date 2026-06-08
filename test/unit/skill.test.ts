import { describe, expect, it } from "vitest";

import { SkillParseError, parseSkillDocument } from "../../src/core/skill.js";

function validSkillWithName(name: string): string {
  return [
    "---",
    `name: ${name}`,
    "description: Reviews React components for avoidable rerenders.",
    "---",
    "# Usage",
    "Run this when React components rerender too often.",
  ].join("\n");
}

describe("skill parser", () => {
  it("requires name and description", () => {
    const source = ["---", "name: incomplete-skill", "---", "Body"].join("\n");

    expect(() => parseSkillDocument(source)).toThrow(SkillParseError);
  });

  it("rejects unsafe names for managed path segments", () => {
    const unsafeNames = [
      "",
      "   ",
      "../escape",
      "nested/name",
      "nested\\name",
      ".hidden",
      "has..dots",
      "nul\u0000byte",
    ];

    for (const name of unsafeNames) {
      expect(() => parseSkillDocument(validSkillWithName(name))).toThrow(SkillParseError);
    }
  });

  it("extracts metadata, body, and headings from a valid skill", () => {
    const skill = parseSkillDocument(validSkillWithName("react-performance-review"));

    expect(skill).toEqual({
      name: "react-performance-review",
      description: "Reviews React components for avoidable rerenders.",
      body: "# Usage\nRun this when React components rerender too often.",
      headings: ["Usage"],
    });
  });
});
