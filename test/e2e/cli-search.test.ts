import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { buildCli, cleanupCliHome, makeCliHome, runSkillrouter } from "./cli-helpers.js";

const homes: string[] = [];

async function makeInitializedHome(): Promise<string> {
  const home = makeCliHome("skillrouter-cli-search");
  homes.push(home);
  const init = await runSkillrouter(["init", "--json"], home);
  const add = await runSkillrouter(["add", "test/fixtures/skills/search-library", "--json"], home);
  expect(init.exitCode).toBe(0);
  expect(add.exitCode).toBe(0);
  return home;
}

beforeAll(async () => {
  await buildCli();
});

afterEach(async () => {
  await Promise.all(homes.splice(0).map((home) => cleanupCliHome(home)));
});

describe("skillrouter CLI search", () => {
  it("search json returns managed path and why_matched", async () => {
    const home = await makeInitializedHome();

    const result = await runSkillrouter(["search", "react rerender performance", "--json"], home);
    const json = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(json).toMatchObject({
      ok: true,
      query: "react rerender performance",
      matches: [
        {
          name: "react-performance-review",
          managed_path: `${home}/skills/react-performance-review/SKILL.md`,
        },
      ],
    });
    expect(json.matches[0].why_matched.length).toBeGreaterThan(0);
  });

  it("managed_path points to SKILL.md file", async () => {
    const home = await makeInitializedHome();

    const result = await runSkillrouter(["search", "python refactor", "--json"], home);
    const json = JSON.parse(result.stdout);
    const managedPath = json.matches[0].managed_path;

    expect(managedPath.endsWith("/SKILL.md")).toBe(true);
    await expect(readFile(managedPath, "utf8")).resolves.toContain("python-refactor");
  });

  it("search output omits source_path read_command and body", async () => {
    const home = await makeInitializedHome();

    const result = await runSkillrouter(["search", "react performance", "--json"], home);
    const json = JSON.parse(result.stdout);
    const match = json.matches[0];

    expect(match).not.toHaveProperty("source_path");
    expect(match).not.toHaveProperty("read_command");
    expect(match).not.toHaveProperty("body");
    expect(match).not.toHaveProperty("content");
  });

  it("direct managed skill edit changes search result", async () => {
    const home = await makeInitializedHome();
    const skillPath = join(home, "skills", "react-performance-review", "SKILL.md");
    await mkdir(join(home, "skills", "react-performance-review"), { recursive: true });
    await writeFile(
      skillPath,
      [
        "---",
        "name: react-performance-review",
        "description: Database migration review after direct edit.",
        "---",
        "Edited body.",
      ].join("\n"),
    );

    const result = await runSkillrouter(["search", "database migration", "--json"], home);
    const json = JSON.parse(result.stdout);

    expect(json.matches[0]).toMatchObject({
      name: "react-performance-review",
      description: "Database migration review after direct edit.",
    });
  });

  it("searches managed skill body text without returning body", async () => {
    const home = await makeInitializedHome();

    const result = await runSkillrouter(["search", "cleanup extraction", "--json"], home);
    const json = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(json.matches[0]).toMatchObject({
      name: "python-refactor",
      managed_path: `${home}/skills/python-refactor/SKILL.md`,
    });
    expect(json.matches[0].why_matched).toContain("body:cleanup");
    expect(json.matches[0].why_matched).toContain("body:extraction");
    expect(json.matches[0]).not.toHaveProperty("body");
  });
});
