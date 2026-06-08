import { parseSkillDocument, SkillParseError, type ParsedSkill, type SkillIssue } from "./skill.js";

export type SkillWarningCode = "suspicious-shell-command" | "prompt-injection-pattern";

export interface SkillWarning {
  readonly code: SkillWarningCode;
  readonly message: string;
}

export interface SkillAuditReport {
  readonly fatal: readonly SkillIssue[];
  readonly warnings: readonly SkillWarning[];
}

export function auditSkillDocument(source: string): SkillAuditReport {
  try {
    return auditParsedSkill(parseSkillDocument(source));
  } catch (error: unknown) {
    if (error instanceof SkillParseError) {
      return {
        fatal: error.issues,
        warnings: [],
      };
    }
    throw error;
  }
}

export function auditParsedSkill(skill: ParsedSkill): SkillAuditReport {
  return {
    fatal: [],
    warnings: detectWarnings(`${skill.description}\n${skill.body}`),
  };
}

function detectWarnings(content: string): readonly SkillWarning[] {
  const warnings: SkillWarning[] = [];

  if (/\bcurl\b.+\|\s*(?:sh|bash)\b|\brm\s+-rf\b|\bsudo\b/.test(content)) {
    warnings.push({
      code: "suspicious-shell-command",
      message: "Skill content contains suspicious shell command patterns.",
    });
  }

  if (/ignore previous instructions|reveal the system prompt|disregard (?:all )?instructions/i.test(content)) {
    warnings.push({
      code: "prompt-injection-pattern",
      message: "Skill content contains prompt-injection-like language.",
    });
  }

  return warnings;
}
