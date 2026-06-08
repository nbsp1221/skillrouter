import { readFile } from "node:fs/promises";

import { scanManagedLibrary } from "../core/managed.js";
import type { ResolvePathsOptions } from "../core/paths.js";
import { searchSkills, type SearchMatch, type SearchableSkill } from "../core/search.js";
import { parseSkillDocument } from "../core/skill.js";

export interface SearchCommandOptions extends ResolvePathsOptions {
  readonly limit?: number;
}

export interface SearchResult {
  readonly ok: true;
  readonly query: string;
  readonly matches: readonly SearchMatch[];
}

export async function searchCommand(query: string, options: SearchCommandOptions = {}): Promise<SearchResult> {
  const scan = await scanManagedLibrary(options);
  const skills: readonly SearchableSkill[] = await Promise.all(
    scan.skills.map(async (skill) => {
      const parsed = parseSkillDocument(await readFile(skill.managed_path, "utf8"));
      return {
        name: parsed.name,
        description: parsed.description,
        body: parsed.body,
        headings: parsed.headings,
        managed_path: skill.managed_path,
        warnings_at_import: skill.warnings_at_import,
      };
    }),
  );

  return {
    ok: true,
    query,
    matches: options.limit === undefined ? searchSkills(query, skills) : searchSkills(query, skills, { limit: options.limit }),
  };
}

export function printSearchResult(result: SearchResult, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  for (const match of result.matches) {
    process.stdout.write(`${match.score}\t${match.name}\t${match.managed_path}\n`);
  }
}
