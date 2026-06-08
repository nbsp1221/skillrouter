import { beforeAll, describe, expect, it } from "vitest";

import { buildCli, makeCliHome, runSkillrouter } from "./cli-helpers.js";

beforeAll(async () => {
  await buildCli();
});

describe("skillrouter CLI unavailable commands", () => {
  it("read command is unavailable", async () => {
    const result = await runSkillrouter(["read", "react-performance-review"], makeCliHome("skillrouter-cli-read"));

    expect(result.exitCode).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain("unknown command");
  });
});
