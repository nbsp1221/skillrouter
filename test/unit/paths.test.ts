import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveSkillrouterPaths } from "../../src/core/paths.js";

describe("Skillrouter paths", () => {
  it("resolves SKILLROUTER_HOME before default home", () => {
    const paths = resolveSkillrouterPaths({
      env: { SKILLROUTER_HOME: "/tmp/skillrouter-test-home" },
      homeDir: "/home/example",
    });

    expect(paths.home).toBe("/tmp/skillrouter-test-home");
    expect(paths.skillsDir).toBe("/tmp/skillrouter-test-home/skills");
  });

  it("builds managed paths without treating sidecar as authority", () => {
    const paths = resolveSkillrouterPaths({
      env: { SKILLROUTER_HOME: "/tmp/skillrouter-test-home" },
      homeDir: "/home/example",
    });

    expect(paths.skillDir("react-performance-review")).toBe(
      join("/tmp/skillrouter-test-home", "skills", "react-performance-review"),
    );
    expect(paths.skillFile("react-performance-review")).toBe(
      join("/tmp/skillrouter-test-home", "skills", "react-performance-review", "SKILL.md"),
    );
    expect(paths.sidecarFile("react-performance-review")).toBe(
      join("/tmp/skillrouter-test-home", "skills", "react-performance-review", ".skillrouter.json"),
    );
  });
});
