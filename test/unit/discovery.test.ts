import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { discoverSkillFiles } from "../../src/core/discovery.js";

const tempRoots: string[] = [];

async function makeTempRoot(): Promise<string> {
  const root = join(tmpdir(), `skillrouter-discovery-${randomUUID()}`);
  tempRoots.push(root);
  await mkdir(root, { recursive: true });
  return root;
}

async function writeSkill(dir: string, name: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    ["---", `name: ${name}`, `description: ${name} description`, "---", "Body"].join("\n"),
  );
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("skill discovery", () => {
  it("treats direct SKILL.md parent as single skill", async () => {
    const root = await makeTempRoot();
    await writeSkill(root, "root-skill");
    await writeSkill(join(root, "nested"), "nested-skill");

    const files = await discoverSkillFiles(root);

    expect(files).toEqual([join(root, "SKILL.md")]);
  });

  it("recursively finds nested SKILL.md while ignoring generated folders", async () => {
    const root = await makeTempRoot();
    await writeSkill(join(root, "skills", "react-performance-review"), "react-performance-review");
    await writeSkill(join(root, "node_modules", "unsafe"), "node-modules-skill");
    await writeSkill(join(root, "dist", "generated"), "dist-skill");

    const files = await discoverSkillFiles(root);

    expect(files).toEqual([join(root, "skills", "react-performance-review", "SKILL.md")]);
  });
});
