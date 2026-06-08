import { describe, expect, it } from "vitest";

import { createProgram } from "../../src/cli.js";

describe("CLI scaffold", () => {
  it("exposes the skillrouter command name", () => {
    const program = createProgram();

    expect(program.name()).toBe("skillrouter");
  });
});
