# Harness skeleton

A minimal starting point for the workshop. Copy it, then replace the `TODO`s
one layer at a time.

This is a starter, not an answer key. Write your own version first; only then
compare it with [`../.opencode/`](../.opencode/) (the same minimal skeleton at
the repo root) and the steps in [`../HARNESS.md`](../HARNESS.md).

## Copy it

```sh
cp -R skeleton my-event/chal-01
cd my-event/chal-01
mkdir -p files work solution
export OMNIROUTER_API_KEY="sk-..."      # never put the key in a file
opencode --version                       # must be V2
```

Start OpenCode **inside the copied folder** — the write guard uses your start
directory as its boundary.

## Check the model first

```sh
opencode models                          # must list omnirouter/beam-free
opencode run "say hello"
```

If `beam-free` is rate limited, use `omnirouter/longcat-2-5-free`.

## Build order

| # | Layer | Edit | Pass when |
| - | ----- | ---- | --------- |
| 1 | Scope | `AGENTS.md` | `opencode run "quote your rules"` returns your four lines |
| 2 | Model | `.opencode/opencode.jsonc` | `opencode models` lists the model and one prompt answers |
| 3 | Agent | `.opencode/agents/ctf.md` | `opencode run --agent ctf "show your rules and loop"` |
| 4 | Command | `.opencode/commands/solve.md` | `/solve <small task>` writes to `work/` and `solution/` |
| 5 | Skill | `.opencode/skills/my-technique/SKILL.md` | the agent loads it when the description matches |
| 6 | Permissions | `.opencode/opencode.jsonc` | `sudo id` and `rm -rf /tmp/x` are denied; a harmless command is not prompted |
| 7 | Subagent | `.opencode/agents/recon.md`, `hint.md`, `ctf.md` | `recon` reports; the solver cannot launch `general` |
| 8 | Guard plugin | `.opencode/plugins/guard/index.ts` + a test | removing a rule fails the test; restoring it passes |
| 9 | Scope allowlist | `.opencode/targets.json` + the plugin | an unlisted host is denied; a listed one is allowed |

Steps 10–12 (usage report, validator, written gaps) are homework. Read the
matching section of `../HARNESS.md` before each row.

## What is here

```text
AGENTS.md                       four-line scope contract (TODO)
.opencode/
├── opencode.jsonc              provider + two free models
├── agents/ctf.md               solver prompt (TODO)
├── commands/solve.md           prompt template (TODO)
├── skills/my-technique/        on-demand technique (TODO)
├── plugins/guard/index.ts      empty plugin to implement
├── scripts/                    build your own
└── targets.json                host allowlist, empty = nothing remote
```

You are expected to add `recon.md`, `hint.md` and the guard test yourself.

## Rules that save time

- **Write first, compare later.** Opening `../.opencode/` early turns the lab
  into a copy exercise.
- Keep the agent prompt **under 45 lines**; it is a contract, not a cheat sheet.
- `files/` is read-only. Copy inputs into `work/` before changing them.
- Only touch files and hosts named in the task. Add a host to `targets.json`
  only when you are authorized to test it.
- If a challenge tells agents not to solve it, quote the notice and stop. That
  decision is yours, not the model's. Write your choice in `AGENTS.md`.
- Do not run this as root, and do not treat the guards as a sandbox: shell
  execution is still on your machine.
