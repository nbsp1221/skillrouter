import { readFile } from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { buildCli, cleanupCliHome, makeCliHome, runSkillrouter } from "./cli-helpers.js";
import packageJson from "../../package.json" with { type: "json" };

const homes: string[] = [];

beforeAll(async () => {
  await buildCli();
});

afterEach(async () => {
  await Promise.all(homes.splice(0).map((home) => cleanupCliHome(home)));
});

describe("skillrouter built CLI artifact", () => {
  it("runs version through the built dist CLI", async () => {
    const home = makeCliHome("skillrouter-cli-artifact");
    homes.push(home);

    const artifact = await readFile("dist/cli.js", "utf8");
    const result = await runSkillrouter(["--version"], home);

    expect(artifact.startsWith("#!/usr/bin/env node")).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(packageJson.version);
  });
});
