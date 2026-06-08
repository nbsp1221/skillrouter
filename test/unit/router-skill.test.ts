import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { parseSkillDocument } from "../../src/core/skill.js";

const routerSkillPath = "router-skill/SKILL.md";

async function readRouterSkill(): Promise<string> {
  return readFile(routerSkillPath, "utf8");
}

describe("router skill template", () => {
  it("router skill has required frontmatter", async () => {
    const skill = parseSkillDocument(await readRouterSkill());

    expect(skill.name).toBe("skillrouter");
    expect(skill.description).toContain("trusted local Agent Skills");
  });

  it("router skill requires search before specialized work", async () => {
    const source = await readRouterSkill();

    expect(source).toContain('skillrouter search "<task>" --json');
    expect(source).toContain("managed_path");
    expect(source).toContain("Compare the top matches");
    expect(source).toContain("If no match is strong enough");
  });

  it("router skill makes search mandatory when Skillrouter is explicitly requested", async () => {
    const source = await readRouterSkill();

    expect(source).toContain("If the user explicitly asks to use Skillrouter");
    expect(source).toContain("search is mandatory");
  });

  it("router skill does not mention unsupported read/install/fetch behavior", async () => {
    const source = await readRouterSkill();
    const forbiddenPhrases = [
      `skillrouter ${"read"}`,
      `install${"-router"}`,
      `git ${"clone"}`,
      `npx ${"skills"}`,
      `web ${"search"}`,
    ];

    for (const phrase of forbiddenPhrases) {
      expect(source.toLowerCase()).not.toContain(phrase);
    }
  });
});
