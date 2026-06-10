#!/usr/bin/env node
import { Command } from "@commander-js/extra-typings";

import { addCommand, printAddResult } from "./commands/add.js";
import { initializeLibrary, printInitResult } from "./commands/init.js";
import { listCommand, printListResult } from "./commands/list.js";
import { printSearchResult, searchCommand } from "./commands/search.js";
import { printStatusResult, statusCommand } from "./commands/status.js";
import packageJson from "../package.json" with { type: "json" };

export function createProgram(): Command {
  const program = new Command();

  program
    .name("skillrouter")
    .description("Local trusted Agent Skill router for LLM agents")
    .version(packageJson.version);

  program
    .command("init")
    .description("Initialize the local Skillrouter managed library")
    .option("--json", "Print stable JSON output")
    .action(async (options) => {
      const result = await initializeLibrary();
      printInitResult(result, options.json === true);
    });

  program
    .command("add")
    .description("Import local candidate skill directories into the managed library")
    .argument("<path>", "Candidate skill directory or library path")
    .option("--json", "Print stable JSON output")
    .option("--replace", "Replace existing managed skills with the same name")
    .action(async (candidatePath, options) => {
      const result = await addCommand(candidatePath, options);
      printAddResult(result, options.json === true);
      if (!result.ok) {
        process.exitCode = 1;
      }
    });

  program
    .command("list")
    .description("List managed skills from the local library")
    .option("--json", "Print stable JSON output")
    .action(async (options) => {
      const result = await listCommand();
      printListResult(result, options.json === true);
    });

  program
    .command("status")
    .description("Report managed library status")
    .option("--json", "Print stable JSON output")
    .action(async (options) => {
      const result = await statusCommand();
      printStatusResult(result, options.json === true);
    });

  program
    .command("search")
    .description("Search managed skills in the local library")
    .argument("<query>", "Task query to match against managed skills")
    .option("--json", "Print stable JSON output")
    .action(async (query, options) => {
      const result = await searchCommand(query);
      printSearchResult(result, options.json === true);
    });

  return program;
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  await program.parseAsync(argv);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await run();
}
