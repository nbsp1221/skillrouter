import { parseFrontmatter } from "./frontmatter.js";
import { SkillFrontmatterSchema } from "../schemas/skill.js";

export type SkillIssueCode = "invalid-skill-frontmatter" | "unsafe-skill-name";

export interface SkillIssue {
  readonly code: SkillIssueCode;
  readonly message: string;
}

export class SkillParseError extends Error {
  readonly issues: readonly SkillIssue[];

  constructor(message: string, issues: readonly SkillIssue[]) {
    super(message);
    this.name = "SkillParseError";
    this.issues = issues;
  }
}

export interface ParsedSkill {
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly headings: readonly string[];
}

const invalidFrontmatterIssue: SkillIssue = {
  code: "invalid-skill-frontmatter",
  message: "Skill frontmatter requires name and description.",
};

export function isSafeSkillName(name: string): boolean {
  return (
    name.trim().length > 0 &&
    name === name.trim() &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..") &&
    !name.includes("\u0000") &&
    !name.startsWith(".")
  );
}

export function parseSkillDocument(source: string): ParsedSkill {
  const parsedFrontmatter = parseFrontmatter(source);
  const frontmatterResult = SkillFrontmatterSchema.safeParse(parsedFrontmatter.data);

  if (!frontmatterResult.success) {
    throw new SkillParseError(invalidFrontmatterIssue.message, [invalidFrontmatterIssue]);
  }

  const { name, description } = frontmatterResult.data;
  if (!isSafeSkillName(name)) {
    throw new SkillParseError(`Unsafe skill name: ${name}`, [
      {
        code: "unsafe-skill-name",
        message: `Unsafe skill name: ${name}`,
      },
    ]);
  }

  return {
    name,
    description,
    body: parsedFrontmatter.body,
    headings: extractHeadings(parsedFrontmatter.body),
  };
}

function extractHeadings(body: string): readonly string[] {
  return body
    .split("\n")
    .flatMap((line) => {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      if (match === null) {
        return [];
      }
      const heading = match.at(2);
      return heading === undefined ? [] : [heading];
    });
}
