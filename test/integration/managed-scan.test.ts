import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { scanManagedLibrary } from "../../src/core/managed.js";

const tempRoots: string[] = [];

async function makeTempHome(): Promise<string> {
  const home = join(tmpdir(), `skillrouter-managed-${randomUUID()}`);
  tempRoots.push(home);
  await mkdir(join(home, "skills"), { recursive: true });
  return home;
}

async function writeManagedSkill(home: string, name: string, description: string): Promise<void> {
  const skillDir = join(home, "skills", name);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "SKILL.md"),
    ["---", `name: ${name}`, `description: ${description}`, "---", "# Usage", "Body"].join("\n"),
  );
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((home) => rm(home, { recursive: true, force: true })));
});

describe("managed library scan", () => {
  it("direct edit of managed SKILL.md is reflected", async () => {
    const home = await makeTempHome();
    await writeManagedSkill(home, "react-performance-review", "Original description.");

    await writeManagedSkill(home, "react-performance-review", "Edited description.");
    const result = await scanManagedLibrary({ env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    expect(result.skills).toEqual([
      {
        name: "react-performance-review",
        description: "Edited description.",
        managed_path: join(home, "skills", "react-performance-review", "SKILL.md"),
        warnings_at_import: [],
      },
    ]);
  });

  it("returns invalid skill count for malformed managed skills without crashing", async () => {
    const home = await makeTempHome();
    await writeManagedSkill(home, "valid-skill", "Valid description.");
    await mkdir(join(home, "skills", "broken-skill"), { recursive: true });
    await writeFile(join(home, "skills", "broken-skill", "SKILL.md"), "not frontmatter");

    const result = await scanManagedLibrary({ env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    expect(result.skills.map((skill) => skill.name)).toEqual(["valid-skill"]);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid_skill_count).toBe(1);
  });
});
