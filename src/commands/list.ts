import { scanManagedLibrary, type InvalidManagedSkill, type ManagedSkill } from "../core/managed.js";
import type { ResolvePathsOptions } from "../core/paths.js";

export interface ListResult {
  readonly ok: true;
  readonly home: string;
  readonly skills: readonly ManagedSkill[];
  readonly invalid: readonly InvalidManagedSkill[];
}

export async function listCommand(options: ResolvePathsOptions = {}): Promise<ListResult> {
  const scan = await scanManagedLibrary(options);
  return {
    ok: true,
    home: scan.home,
    skills: scan.skills,
    invalid: scan.invalid,
  };
}

export function printListResult(result: ListResult, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  for (const skill of result.skills) {
    process.stdout.write(`${skill.name}\t${skill.description}\t${skill.managed_path}\n`);
  }
}
