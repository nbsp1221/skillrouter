import type { AddResult } from "../core/import.js";
import { addSkillsToLibrary } from "../core/import.js";

export interface AddCommandOptions {
  readonly json?: boolean;
  readonly replace?: boolean;
}

export async function addCommand(candidatePath: string, options: AddCommandOptions): Promise<AddResult> {
  return addSkillsToLibrary(candidatePath, { replace: options.replace === true });
}

export function printAddResult(result: AddResult, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (result.ok) {
    process.stdout.write(`Imported ${result.imported} skill(s), replaced ${result.replaced} skill(s)\n`);
    return;
  }

  process.stderr.write(`${result.errors.map((error) => error.message).join("\n")}\n`);
}
