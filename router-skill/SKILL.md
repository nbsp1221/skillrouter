---
name: skillrouter
description: Use when an AI agent should route a task through trusted local Agent Skills managed by Skillrouter before doing specialized work.
---
# Skillrouter

Before doing specialized work, search the trusted local Skillrouter library:

```bash
skillrouter search "<task>" --json
```

Use the user's request as `<task>`. Prefer JSON output so the result can be parsed reliably.

If the user explicitly asks to use Skillrouter, search is mandatory.

Compare the top matches by `name`, `description`, `score`, and `why_matched`. Select a skill only when the match clearly applies to the current task.

If a match is selected, open the returned `managed_path` and follow that skill's instructions. The `managed_path` points to the trusted local `SKILL.md` file.

If no match is strong enough, continue normally without loading a routed skill.
