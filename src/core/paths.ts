import { homedir } from "node:os";
import { join, resolve } from "node:path";

export interface ResolvePathsOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly homeDir?: string;
}

export interface SkillrouterPaths {
  readonly home: string;
  readonly skillsDir: string;
  readonly skillDir: (name: string) => string;
  readonly skillFile: (name: string) => string;
  readonly sidecarFile: (name: string) => string;
}

export function resolveSkillrouterPaths(options: ResolvePathsOptions = {}): SkillrouterPaths {
  const env = options.env ?? process.env;
  const baseHome = options.homeDir ?? homedir();
  const configuredHome = env["SKILLROUTER_HOME"]?.trim();
  const home = resolve(configuredHome && configuredHome.length > 0 ? configuredHome : join(baseHome, ".skillrouter"));
  const skillsDir = join(home, "skills");

  return {
    home,
    skillsDir,
    skillDir: (name: string) => join(skillsDir, name),
    skillFile: (name: string) => join(skillsDir, name, "SKILL.md"),
    sidecarFile: (name: string) => join(skillsDir, name, ".skillrouter.json"),
  };
}
