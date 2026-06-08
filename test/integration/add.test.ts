import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { addSkillsToLibrary } from "../../src/core/import.js";

const tempRoots: string[] = [];

async function makeTempRoot(prefix: string): Promise<string> {
  const root = join(tmpdir(), `${prefix}-${randomUUID()}`);
  tempRoots.push(root);
  await mkdir(root, { recursive: true });
  return root;
}

async function writeCandidateSkill(
  root: string,
  relativeDir: string,
  name: string,
  description: string,
  body = "Body",
): Promise<string> {
  const skillDir = join(root, relativeDir);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "SKILL.md"),
    ["---", `name: ${name}`, `description: ${description}`, "---", body].join("\n"),
  );
  return skillDir;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("add skills to managed library", () => {
  it("fails when no skill files are discovered", async () => {
    const home = await makeTempRoot("skillrouter-add-home");
    const sourceRoot = await makeTempRoot("skillrouter-empty-source");

    const result = await addSkillsToLibrary(join(sourceRoot, "missing"), {
      env: { SKILLROUTER_HOME: home },
      homeDir: "/unused",
    });

    expect(result.ok).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.errors.map((error) => error.code)).toEqual(["no-skills-found"]);
  });

  it("imports single skill directory with bundled assets", async () => {
    const home = await makeTempRoot("skillrouter-add-home");
    const sourceRoot = await makeTempRoot("skillrouter-add-source");
    const skillDir = await writeCandidateSkill(
      sourceRoot,
      "react-performance-review",
      "react-performance-review",
      "Reviews React components for avoidable rerenders.",
    );
    await mkdir(join(skillDir, "references"), { recursive: true });
    await writeFile(join(skillDir, "references", "checklist.md"), "Check prop identity.");

    const result = await addSkillsToLibrary(skillDir, { env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    expect(result.ok).toBe(true);
    expect(result.imported).toBe(1);
    expect(result.skills).toEqual([
      {
        name: "react-performance-review",
        managed_path: join(home, "skills", "react-performance-review", "SKILL.md"),
        warnings_at_import: [],
      },
    ]);
    await expect(readFile(join(home, "skills", "react-performance-review", "references", "checklist.md"), "utf8")).resolves.toBe(
      "Check prop identity.",
    );
    const sidecar = JSON.parse(await readFile(join(home, "skills", "react-performance-review", ".skillrouter.json"), "utf8"));
    expect(sidecar).toMatchObject({ warnings_at_import: [] });
    expect(typeof sidecar.imported_at).toBe("string");
  });

  it("imports recursive library atomically", async () => {
    const home = await makeTempRoot("skillrouter-add-home");
    const sourceRoot = await makeTempRoot("skillrouter-add-source");
    await writeCandidateSkill(sourceRoot, "library/a", "a-skill", "A skill.");
    await writeCandidateSkill(sourceRoot, "library/b", "b-skill", "B skill.");

    const result = await addSkillsToLibrary(join(sourceRoot, "library"), {
      env: { SKILLROUTER_HOME: home },
      homeDir: "/unused",
    });

    expect(result.ok).toBe(true);
    expect(result.imported).toBe(2);
    expect(await readdir(join(home, "skills"))).toEqual(["a-skill", "b-skill"]);
  });

  it("duplicate candidate names fail and copy nothing", async () => {
    const home = await makeTempRoot("skillrouter-add-home");
    const sourceRoot = await makeTempRoot("skillrouter-add-source");
    await writeCandidateSkill(sourceRoot, "library/one", "duplicate-skill", "First.");
    await writeCandidateSkill(sourceRoot, "library/two", "duplicate-skill", "Second.");

    const result = await addSkillsToLibrary(join(sourceRoot, "library"), {
      env: { SKILLROUTER_HOME: home },
      homeDir: "/unused",
    });

    expect(result.ok).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.errors.map((error) => error.code)).toEqual(["duplicate-name"]);
    expect(await readdir(join(home, "skills"))).toEqual([]);
  });

  it("duplicate managed name fails without replace", async () => {
    const home = await makeTempRoot("skillrouter-add-home");
    const oldRoot = await makeTempRoot("skillrouter-old-source");
    const newRoot = await makeTempRoot("skillrouter-new-source");
    const oldSkill = await writeCandidateSkill(oldRoot, "skill", "same-skill", "Old description.");
    const newSkill = await writeCandidateSkill(newRoot, "skill", "same-skill", "New description.");
    await addSkillsToLibrary(oldSkill, { env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    const result = await addSkillsToLibrary(newSkill, { env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    expect(result.ok).toBe(false);
    expect(result.errors.map((error) => error.code)).toEqual(["existing-name"]);
    await expect(readFile(join(home, "skills", "same-skill", "SKILL.md"), "utf8")).resolves.toContain("Old description.");
  });

  it("replace swaps existing managed skill after validation", async () => {
    const home = await makeTempRoot("skillrouter-add-home");
    const oldRoot = await makeTempRoot("skillrouter-old-source");
    const newRoot = await makeTempRoot("skillrouter-new-source");
    const oldSkill = await writeCandidateSkill(oldRoot, "skill", "same-skill", "Old description.");
    const newSkill = await writeCandidateSkill(newRoot, "skill", "same-skill", "New description.");
    await addSkillsToLibrary(oldSkill, { env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    const result = await addSkillsToLibrary(newSkill, {
      env: { SKILLROUTER_HOME: home },
      homeDir: "/unused",
      replace: true,
    });

    expect(result.ok).toBe(true);
    expect(result.replaced).toBe(1);
    await expect(readFile(join(home, "skills", "same-skill", "SKILL.md"), "utf8")).resolves.toContain("New description.");
  });

  it("replace removes stale old bundled files", async () => {
    const home = await makeTempRoot("skillrouter-add-home");
    const oldRoot = await makeTempRoot("skillrouter-old-source");
    const newRoot = await makeTempRoot("skillrouter-new-source");
    const oldSkill = await writeCandidateSkill(oldRoot, "skill", "same-skill", "Old description.");
    await mkdir(join(oldSkill, "references"), { recursive: true });
    await writeFile(join(oldSkill, "references", "old.md"), "stale");
    const newSkill = await writeCandidateSkill(newRoot, "skill", "same-skill", "New description.");
    await addSkillsToLibrary(oldSkill, { env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    await addSkillsToLibrary(newSkill, {
      env: { SKILLROUTER_HOME: home },
      homeDir: "/unused",
      replace: true,
    });

    expect(await pathExists(join(dirname(join(home, "skills", "same-skill", "SKILL.md")), "references", "old.md"))).toBe(false);
  });
});
