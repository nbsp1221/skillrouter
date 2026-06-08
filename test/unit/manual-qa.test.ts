import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("manual QA documentation", () => {
  it("documents the disposable 100-skill corpus scenario", async () => {
    const source = await readFile("docs/manual-qa.md", "utf8");

    expect(source).toContain("/tmp/skillrouter-corpus");
    expect(source).toContain("SKILLROUTER_HOME");
    expect(source).toContain("skillrouter add");
    expect(source).toContain("skillrouter search");
  });
});
