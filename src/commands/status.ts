import { stat } from "node:fs/promises";

import { scanManagedLibrary } from "../core/managed.js";
import { resolveSkillrouterPaths, type ResolvePathsOptions } from "../core/paths.js";

export interface StatusResult {
  readonly ok: true;
  readonly home: string;
  readonly skills_dir: string;
  readonly initialized: boolean;
  readonly skill_count: number;
  readonly warning_count: number;
  readonly invalid_skill_count: number;
}

export async function statusCommand(options: ResolvePathsOptions = {}): Promise<StatusResult> {
  const paths = resolveSkillrouterPaths(options);
  const initialized = await directoryExists(paths.skillsDir);
  const scan = await scanManagedLibrary(options);

  return {
    ok: true,
    home: paths.home,
    skills_dir: paths.skillsDir,
    initialized,
    skill_count: scan.skills.length,
    warning_count: scan.skills.reduce((count, skill) => count + skill.warnings_at_import.length, 0),
    invalid_skill_count: scan.invalid_skill_count,
  };
}

export function printStatusResult(result: StatusResult, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      `home: ${result.home}`,
      `skills_dir: ${result.skills_dir}`,
      `initialized: ${result.initialized}`,
      `skill_count: ${result.skill_count}`,
      `warning_count: ${result.warning_count}`,
      `invalid_skill_count: ${result.invalid_skill_count}`,
    ].join("\n"),
  );
  process.stdout.write("\n");
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
