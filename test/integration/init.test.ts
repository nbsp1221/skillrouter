import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { initializeLibrary } from "../../src/commands/init.js";

const tempRoots: string[] = [];

async function makeTempRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "skillrouter-init-test-"));
  tempRoots.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("skillrouter init", () => {
  it("creates skills directory under temp home", async () => {
    const home = await makeTempRoot();

    const result = await initializeLibrary({ env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    expect(result).toEqual({
      ok: true,
      home,
      skills_dir: join(home, "skills"),
      initialized: true,
      created: true,
    });
    await expect(readFile(join(home, "skills"), "utf8")).rejects.toMatchObject({ code: "EISDIR" });
  });

  it("is idempotent and reports created false on second run", async () => {
    const home = await makeTempRoot();

    await initializeLibrary({ env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });
    const second = await initializeLibrary({ env: { SKILLROUTER_HOME: home }, homeDir: "/unused" });

    expect(second).toEqual({
      ok: true,
      home,
      skills_dir: join(home, "skills"),
      initialized: true,
      created: false,
    });
  });
});
