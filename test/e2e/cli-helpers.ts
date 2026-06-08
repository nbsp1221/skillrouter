import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface CliRunResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export function makeCliHome(prefix: string): string {
  return join(tmpdir(), `${prefix}-${randomUUID()}`);
}

export async function cleanupCliHome(home: string): Promise<void> {
  await rm(home, { recursive: true, force: true });
}

export async function buildCli(): Promise<void> {
  const result = await runProcess("pnpm", ["typecheck"], {});
  if (result.exitCode !== 0) {
    throw new Error(`Build failed:\n${result.stdout}\n${result.stderr}`);
  }
}

export function runSkillrouter(args: readonly string[], home: string): Promise<CliRunResult> {
  return runProcess("pnpm", ["exec", "tsx", "src/cli.ts", ...args], { SKILLROUTER_HOME: home });
}

function runProcess(command: string, args: readonly string[], env: Readonly<Record<string, string>>): Promise<CliRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? -1,
      });
    });
  });
}
