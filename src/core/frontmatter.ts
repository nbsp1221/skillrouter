import { parse } from "yaml";

export type FrontmatterErrorCode = "missing-opening-boundary" | "missing-closing-boundary" | "invalid-yaml";

export class FrontmatterError extends Error {
  readonly code: FrontmatterErrorCode;

  constructor(code: FrontmatterErrorCode, message: string) {
    super(message);
    this.name = "FrontmatterError";
    this.code = code;
  }
}

export interface ParsedFrontmatter {
  readonly data: unknown;
  readonly body: string;
}

export function parseFrontmatter(source: string): ParsedFrontmatter {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const openingBoundary = lines.at(0);

  if (openingBoundary !== "---") {
    throw new FrontmatterError("missing-opening-boundary", "SKILL.md must start with YAML frontmatter boundary.");
  }

  const closingBoundaryIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingBoundaryIndex < 0) {
    throw new FrontmatterError("missing-closing-boundary", "SKILL.md frontmatter must end with a closing boundary.");
  }

  const frontmatter = lines.slice(1, closingBoundaryIndex).join("\n");
  const body = lines.slice(closingBoundaryIndex + 1).join("\n");

  try {
    return {
      data: parse(frontmatter),
      body,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new FrontmatterError("invalid-yaml", error.message);
    }
    throw error;
  }
}
