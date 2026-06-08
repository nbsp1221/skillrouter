export interface SearchableSkill {
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly headings: readonly string[];
  readonly managed_path: string;
  readonly warnings_at_import: readonly SearchWarning[];
}

export interface SearchWarning {
  readonly code: string;
  readonly message: string;
}

export interface SearchMatch {
  readonly name: string;
  readonly description: string;
  readonly score: number;
  readonly managed_path: string;
  readonly why_matched: readonly string[];
  readonly warnings_at_import: readonly SearchWarning[];
}

export interface SearchOptions {
  readonly limit?: number;
}

const defaultLimit = 5;

const fieldWeights = {
  name: 5,
  description: 4,
  headings: 2,
  body: 1,
} as const;

type MatchField = keyof typeof fieldWeights;

export function searchSkills(
  query: string,
  skills: readonly SearchableSkill[],
  options: SearchOptions = {},
): readonly SearchMatch[] {
  const queryTokens = tokenize(query);
  const limit = options.limit ?? defaultLimit;

  if (queryTokens.length === 0 || limit <= 0) {
    return [];
  }

  return skills
    .flatMap((skill) => scoreSkill(skill, queryTokens))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, limit);
}

function scoreSkill(skill: SearchableSkill, queryTokens: readonly string[]): readonly SearchMatch[] {
  const fields: Record<MatchField, ReadonlySet<string>> = {
    name: new Set(tokenize(skill.name)),
    description: new Set(tokenize(skill.description)),
    headings: new Set(tokenize(skill.headings.join(" "))),
    body: new Set(tokenize(skill.body)),
  };
  const whyMatched: string[] = [];
  let score = 0;

  for (const token of queryTokens) {
    for (const field of ["name", "description", "headings", "body"] as const) {
      if (fields[field].has(token)) {
        score += fieldWeights[field];
        whyMatched.push(`${field}:${token}`);
      }
    }
  }

  if (score === 0) {
    return [];
  }

  return [
    {
      name: skill.name,
      description: skill.description,
      score,
      managed_path: skill.managed_path,
      why_matched: whyMatched,
      warnings_at_import: skill.warnings_at_import,
    },
  ];
}

function tokenize(text: string): readonly string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(normalizeToken)
    .filter((token) => token.length > 0);

  return [...new Set(tokens)];
}

function normalizeToken(token: string): string {
  if (token.length > 4 && token.endsWith("s")) {
    return token.slice(0, -1);
  }
  return token;
}
