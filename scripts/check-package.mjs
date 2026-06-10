#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const allowedPaths = new Set(["LICENSE", "README.md", "dist/cli.js", "package.json", "router-skill/SKILL.md"]);
const forbiddenPrefixes = [".vscode/", "src/", "test/"];
const forbiddenPaths = new Set(["tsconfig.json", "tsup.config.ts", "vitest.config.ts"]);

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const parsed = JSON.parse(output);
const [pack] = parsed;
if (pack === undefined || !Array.isArray(pack.files)) {
  throw new Error("npm pack --dry-run --json returned an unexpected shape.");
}

const paths = pack.files.map((file) => file.path).sort();
const missing = [...allowedPaths].filter((path) => !paths.includes(path));
const forbidden = paths.filter(
  (path) => forbiddenPaths.has(path) || forbiddenPrefixes.some((prefix) => path.startsWith(prefix)),
);
const unexpected = paths.filter((path) => !allowedPaths.has(path));

if (missing.length > 0 || forbidden.length > 0 || unexpected.length > 0) {
  const report = {
    ok: false,
    missing,
    forbidden,
    unexpected,
    paths,
  };
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ ok: true, paths }, null, 2)}\n`);
}
