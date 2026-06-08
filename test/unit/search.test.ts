import { describe, expect, it } from "vitest";

import { searchSkills, type SearchableSkill } from "../../src/core/search.js";

function skill(input: {
  readonly name: string;
  readonly description: string;
  readonly body?: string;
  readonly headings?: readonly string[];
  readonly managedPath?: string;
}): SearchableSkill {
  return {
    name: input.name,
    description: input.description,
    body: input.body ?? "",
    headings: input.headings ?? [],
    managed_path: input.managedPath ?? `/tmp/skills/${input.name}/SKILL.md`,
    warnings_at_import: [],
  };
}

describe("lexical skill search", () => {
  it("ranks exact name and description matches above body-only matches", () => {
    const results = searchSkills("react rerender performance", [
      skill({
        name: "generic-debugging",
        description: "General debugging helper.",
        body: "react rerender performance react rerender performance",
      }),
      skill({
        name: "react-performance-review",
        description: "Reviews React components for avoidable rerenders.",
      }),
    ]);

    expect(results.at(0)?.name).toBe("react-performance-review");
    expect(results.at(0)?.why_matched).toContain("name:react");
    expect(results.at(0)?.why_matched).toContain("description:rerender");
  });

  it("top limit defaults to 5", () => {
    const skills = Array.from({ length: 6 }, (_, index) =>
      skill({
        name: `react-skill-${index}`,
        description: "React helper.",
      }),
    );

    const results = searchSkills("react", skills);

    expect(results).toHaveLength(5);
  });

  it("uses only managed paths passed in by managed scan", () => {
    const results = searchSkills("python", [
      skill({
        name: "python-review",
        description: "Python review.",
        managedPath: "/tmp/custom-managed/python-review/SKILL.md",
      }),
    ]);

    expect(results).toEqual([
      expect.objectContaining({
        managed_path: "/tmp/custom-managed/python-review/SKILL.md",
      }),
    ]);
  });
});
