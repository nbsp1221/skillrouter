import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod";

import { resolveSkillrouterPaths, type ResolvePathsOptions } from "./paths.js";
import { parseSkillDocument } from "./skill.js";

const SidecarSchema = z
  .object({
    warnings_at_import: z
      .array(
        z.object({
          code: z.string(),
          message: z.string(),
        }),
      )
      .default([]),
  })
  .passthrough();

export interface ManagedSkill {
  readonly name: string;
  readonly description: string;
  readonly managed_path: string;
  readonly warnings_at_import: readonly ManagedWarning[];
}

export interface ManagedWarning {
  readonly code: string;
  readonly message: string;
}

export interface InvalidManagedSkill {
  readonly managed_path: string;
  readonly message: string;
}

export interface ManagedScanResult {
  readonly home: string;
  readonly skills_dir: string;
  readonly skills: readonly ManagedSkill[];
  readonly invalid: readonly InvalidManagedSkill[];
  readonly invalid_skill_count: number;
}

export async function scanManagedLibrary(options: ResolvePathsOptions = {}): Promise<ManagedScanResult> {
  const paths = resolveSkillrouterPaths(options);
  const entries = await readManagedSkillDirectories(paths.skillsDir);
  const skills: ManagedSkill[] = [];
  const invalid: InvalidManagedSkill[] = [];

  for (const entry of entries) {
    const skillFile = join(paths.skillsDir, entry, "SKILL.md");
    try {
      const source = await readFile(skillFile, "utf8");
      const skill = parseSkillDocument(source);
      skills.push({
        name: skill.name,
        description: skill.description,
        managed_path: skillFile,
        warnings_at_import: await readWarningsAtImport(join(paths.skillsDir, entry, ".skillrouter.json")),
      });
    } catch (error: unknown) {
      invalid.push({
        managed_path: skillFile,
        message: error instanceof Error ? error.message : "Unknown managed skill error.",
      });
    }
  }

  return {
    home: paths.home,
    skills_dir: paths.skillsDir,
    skills: skills.sort((left, right) => left.name.localeCompare(right.name)),
    invalid,
    invalid_skill_count: invalid.length,
  };
}

async function readManagedSkillDirectories(skillsDir: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error: unknown) {
    if (hasFileSystemCode(error, "ENOENT")) {
      return [];
    }
    throw error;
  }
}

async function readWarningsAtImport(sidecarPath: string): Promise<readonly ManagedWarning[]> {
  try {
    const raw = await readFile(sidecarPath, "utf8");
    const parsedJson: unknown = JSON.parse(raw);
    const sidecar = SidecarSchema.safeParse(parsedJson);
    return sidecar.success ? sidecar.data.warnings_at_import : [];
  } catch (error: unknown) {
    if (hasFileSystemCode(error, "ENOENT") || error instanceof SyntaxError) {
      return [];
    }
    throw error;
  }
}

function hasFileSystemCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
