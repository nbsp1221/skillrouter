import { cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import { auditParsedSkill, type SkillWarning } from "./audit.js";
import { discoverSkillFiles } from "./discovery.js";
import { resolveSkillrouterPaths, type ResolvePathsOptions } from "./paths.js";
import { parseSkillDocument, type ParsedSkill } from "./skill.js";

export type AddErrorCode = "invalid-skill" | "duplicate-name" | "existing-name" | "no-skills-found";

export interface AddError {
  readonly code: AddErrorCode;
  readonly message: string;
  readonly paths?: readonly string[];
}

export interface AddedSkill {
  readonly name: string;
  readonly managed_path: string;
  readonly warnings_at_import: readonly SkillWarning[];
}

export interface AddResult {
  readonly ok: boolean;
  readonly discovered: number;
  readonly imported: number;
  readonly replaced: number;
  readonly skipped: number;
  readonly warnings: readonly SkillWarning[];
  readonly errors: readonly AddError[];
  readonly skills: readonly AddedSkill[];
}

export interface AddSkillsOptions extends ResolvePathsOptions {
  readonly replace?: boolean;
  readonly now?: () => Date;
}

interface CandidateSkill {
  readonly parsed: ParsedSkill;
  readonly candidateDir: string;
  readonly skillFile: string;
  readonly managedPath: string;
  readonly warningsAtImport: readonly SkillWarning[];
}

export async function addSkillsToLibrary(candidatePath: string, options: AddSkillsOptions = {}): Promise<AddResult> {
  const paths = resolveSkillrouterPaths(options);
  const replace = options.replace === true;
  const now = options.now ?? (() => new Date());
  const skillFiles = await discoverSkillFiles(candidatePath);
  const candidates: CandidateSkill[] = [];
  const errors: AddError[] = [];

  await mkdir(paths.skillsDir, { recursive: true });

  if (skillFiles.length === 0) {
    return {
      ok: false,
      discovered: 0,
      imported: 0,
      replaced: 0,
      skipped: 0,
      warnings: [],
      errors: [
        {
          code: "no-skills-found",
          message: `No SKILL.md files found under: ${candidatePath}`,
          paths: [candidatePath],
        },
      ],
      skills: [],
    };
  }

  for (const skillFile of skillFiles) {
    try {
      const source = await readFile(skillFile, "utf8");
      const parsed = parseSkillDocument(source);
      const audit = auditParsedSkill(parsed);
      candidates.push({
        parsed,
        candidateDir: dirname(skillFile),
        skillFile,
        managedPath: paths.skillFile(parsed.name),
        warningsAtImport: audit.warnings,
      });
    } catch (error: unknown) {
      errors.push({
        code: "invalid-skill",
        message: error instanceof Error ? error.message : "Unknown skill parsing error.",
        paths: [skillFile],
      });
    }
  }

  errors.push(...duplicateCandidateErrors(candidates));
  errors.push(...(await existingManagedErrors(candidates, replace, paths.skillDir)));

  if (errors.length > 0) {
    return {
      ok: false,
      discovered: skillFiles.length,
      imported: 0,
      replaced: 0,
      skipped: skillFiles.length,
      warnings: candidates.flatMap((candidate) => candidate.warningsAtImport),
      errors,
      skills: [],
    };
  }

  const stagingRoot = join(paths.home, ".tmp", `import-${randomUUID()}`);
  const addedSkills: AddedSkill[] = [];
  let imported = 0;
  let replaced = 0;

  try {
    await mkdir(stagingRoot, { recursive: true });
    for (const candidate of candidates) {
      const stagedDir = join(stagingRoot, candidate.parsed.name);
      await cp(candidate.candidateDir, stagedDir, { recursive: true });
      await writeImportSidecar(stagedDir, now(), candidate.warningsAtImport);
    }

    for (const candidate of candidates) {
      const stagedDir = join(stagingRoot, candidate.parsed.name);
      const targetDir = paths.skillDir(candidate.parsed.name);
      const targetExists = await pathExists(targetDir);

      if (targetExists) {
        await rm(targetDir, { recursive: true, force: true });
        replaced += 1;
      } else {
        imported += 1;
      }

      await rename(stagedDir, targetDir);
      addedSkills.push({
        name: candidate.parsed.name,
        managed_path: candidate.managedPath,
        warnings_at_import: candidate.warningsAtImport,
      });
    }
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }

  return {
    ok: true,
    discovered: skillFiles.length,
    imported,
    replaced,
    skipped: 0,
    warnings: candidates.flatMap((candidate) => candidate.warningsAtImport),
    errors: [],
    skills: addedSkills.sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function duplicateCandidateErrors(candidates: readonly CandidateSkill[]): readonly AddError[] {
  const pathsByName = new Map<string, readonly string[]>();

  for (const candidate of candidates) {
    const existing = pathsByName.get(candidate.parsed.name) ?? [];
    pathsByName.set(candidate.parsed.name, [...existing, candidate.skillFile]);
  }

  return [...pathsByName.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([name, paths]) => ({
      code: "duplicate-name",
      message: `Duplicate skill name: ${name}`,
      paths,
    }));
}

async function existingManagedErrors(
  candidates: readonly CandidateSkill[],
  replace: boolean,
  skillDir: (name: string) => string,
): Promise<readonly AddError[]> {
  if (replace) {
    return [];
  }

  const errors: AddError[] = [];
  for (const candidate of candidates) {
    if (await pathExists(skillDir(candidate.parsed.name))) {
      errors.push({
        code: "existing-name",
        message: `Managed skill already exists: ${candidate.parsed.name}`,
        paths: [candidate.managedPath],
      });
    }
  }
  return errors;
}

async function writeImportSidecar(
  stagedDir: string,
  importedAt: Date,
  warningsAtImport: readonly SkillWarning[],
): Promise<void> {
  await writeFile(
    join(stagedDir, ".skillrouter.json"),
    `${JSON.stringify(
      {
        imported_at: importedAt.toISOString(),
        warnings_at_import: warningsAtImport,
      },
      null,
      2,
    )}\n`,
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
