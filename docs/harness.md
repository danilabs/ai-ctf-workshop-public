# Harness: how a harness works and how OpenCode runs here

[← Back to the README](../README.md)

## How a harness works

A harness is the loop that lets a model *act*: it assembles context, calls the
model, runs the tool calls somewhere, feeds observations back, and keeps state
between turns.

```text
task ──▶ context assembly ──▶ model ──▶ tool call ──▶ EXECUTION ──▶ observation
              ▲                                          │
              └────────── state / compaction ◀───────────┘
                                    │
                              artifact + flag
                                    ▼
                            verification / score
```

Five layers, each with its own failure mode:

| Layer | Question it answers | Failure mode | In this repo |
| ----- | ------------------- | ------------ | ------------ |
| Context | does the model know what to do? | never picks the right technique | `AGENTS.md`, agents, skills |
| Tools | can it do the thing? | missing primitive, gives up | shell, read/write/patch, `webfetch`, subagents |
| Execution | where does the command run? | breaks the host, challenge pwns you | **your machine** — no sandbox |
| State | what survives the next turn? | long solves collapse | compaction, `work/notes.md` |
| Verification | is the result real? | unprovable "solves" | flag format, `solution/flag.txt` |

Read the rest of this README as a tour of those layers: what is configured, why
it is shaped that way, and where the boundary sits.


## How OpenCode runs here

OpenCode is a terminal agent harness. A **session** = a model + an **agent**
(system prompt, permissions, model) + **tools** (shell, read, edit, write,
patch, webfetch, skill, subagent, plus Code Mode `execute`). The agent loops:
model proposes tool calls, harness executes them, results go back.

What matters in this kit:

- **Start directory is the scope.** Config and `AGENTS.md` are discovered
  upward, but the write guard uses the folder you started in. Starting inside a
  challenge is the intended mode; starting at the root is kit maintenance.
- **`AGENTS.md` is loaded automatically** in every session and carries the
  hard rules (scope, workspace, flag hygiene).
- **Skills are advertised, not loaded.** Only each skill's name and description
  sit in context; the body loads when the agent picks it, which keeps prompts
  cheap.
- **Config hot-reloads** on save; `/reload` forces a full reload.

Where each harness layer lives, concretely:

| Layer | Implementation here | Enforced? |
| ----- | ------------------- | --------- |
| Context | `AGENTS.md`, `agents/*.md`, `skills/` | n/a (instruction) |
| Tools | built-in tools; Playwright MCP disabled | yes (tool list) |
| Execution | `shell` on your host; `files/` scripts run locally | **no sandbox** |
| State | compaction, `todowrite`, `work/notes.md` | partly (compaction) |
| Verification | flag format from the event README, `solution/flag.txt` | **no scorer** |
