import { mkdir, stat } from "node:fs/promises";

import { resolveSkillrouterPaths, type ResolvePathsOptions } from "../core/paths.js";

export interface InitResult {
  readonly ok: true;
  readonly home: string;
  readonly skills_dir: string;
  readonly initialized: true;
  readonly created: boolean;
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

export async function initializeLibrary(options: ResolvePathsOptions = {}): Promise<InitResult> {
  const paths = resolveSkillrouterPaths(options);
  const existed = await directoryExists(paths.skillsDir);

  await mkdir(paths.skillsDir, { recursive: true });

  return {
    ok: true,
    home: paths.home,
    skills_dir: paths.skillsDir,
    initialized: true,
    created: !existed,
  };
}

export function printInitResult(result: InitResult, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`Skillrouter initialized at ${result.home}\n`);
}
