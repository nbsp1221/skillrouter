# Skillrouter

Local trusted Agent Skill routing for LLM agents.

Skillrouter lets an agent import reviewed local `SKILL.md` directories into a managed library, search only that trusted library, and read selected managed skills directly from the filesystem.

## Status

Early PoC. The package is local-first and currently targets Codex workflows.

## Install

```bash
npm install -g skillrouter
```

## Usage

```bash
skillrouter init
skillrouter add ./path/to/skill-or-skill-library
skillrouter search "review this React component for render performance" --json
```

Skillrouter does not search the internet or fetch public skills. External discovery is the agent's responsibility; Skillrouter starts at trusted local import.

