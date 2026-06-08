import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildCli, cleanupCliHome, makeCliHome, runSkillrouter } from "./cli-helpers.js";

const home = makeCliHome("skillrouter-cli-roundtrip");

beforeAll(async () => {
  await buildCli();
});

afterAll(async () => {
  await cleanupCliHome(home);
});

describe("skillrouter CLI init add list status", () => {
  it("init add list status JSON round trip", async () => {
    const init = await runSkillrouter(["init", "--json"], home);
    const add = await runSkillrouter(["add", "test/fixtures/skills/react-performance-review", "--json"], home);
    const list = await runSkillrouter(["list", "--json"], home);
    const status = await runSkillrouter(["status", "--json"], home);

    expect(init.exitCode).toBe(0);
    expect(add.exitCode).toBe(0);
    expect(list.exitCode).toBe(0);
    expect(status.exitCode).toBe(0);
    expect(JSON.parse(list.stdout)).toMatchObject({
      ok: true,
      home,
      skills: [
        {
          name: "react-performance-review",
          description: "Reviews React components for avoidable rerenders.",
          managed_path: `${home}/skills/react-performance-review/SKILL.md`,
        },
      ],
      invalid: [],
    });
    expect(JSON.parse(status.stdout)).toMatchObject({
      ok: true,
      home,
      skills_dir: `${home}/skills`,
      initialized: true,
      skill_count: 1,
      warning_count: 0,
      invalid_skill_count: 0,
    });
  });
});
