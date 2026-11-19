# Build your own CTF harness

This is a **build guide**, not a template dump. You will write the harness
yourself, one layer at a time, checking each layer before adding the next. The
`.opencode/` directory in this repository is the *answer key*: read it only
after you have written your own version of a step, and compare.

Why this way: an agent prompt that you copied encodes someone else's
assumptions about scope, output format and safety. A prompt you wrote encodes
yours — and you will be able to explain every line when it misbehaves.

**Time:** about 2 hours. **You need:** OpenCode installed, a router key
(`OMNIROUTER_API_KEY`, from the instructor), and a challenge folder to point it at.

Read [the harness model](docs/harness.md) first if you have not:
context, tools, execution, state, verification.

**Workshop.** [`workshop.html`](workshop.html) is the guided version of this
guide: the same steps in a 70-minute lab, with a checkpoint after each one. The
mapping:

| Workshop step | This guide |
| ------------- | ---------- |
| 0 Setup | prerequisites |
| 1 Scope and model | steps 1–2 |
| 2 Agent | step 3 |
| 3 Command and skill | steps 4–5 |
| 4 Permissions | step 6 |
| 5 Subagent | step 7 |
| 6 Plugins (guard, tool, hook) | step 8 |
| 7 Verify, measure, commit | steps 10–11 |

Steps 9 and 12 (scaffolding and the list of gaps) are homework.

Targets OpenCode **V2** (verified with `opencode v2.3.0`). Check your version
with `opencode --version`; the V1 plugin API will not load.

---

## Rule zero: write it, then compare

Each step ends with **Write** (yours), **Verify** (a command), **Compare**
(the reference file, only after yours works). Do not open the reference file
before writing your own draft; that is the whole exercise.

---

## Step 1 — Skeleton and the scope contract

```sh
mkdir -p .opencode/{agents,commands,skills,plugins,scripts}
cd <a challenge folder>
```

Now write `AGENTS.md` **in the folder you solve from** (or the repo root if
the kit is shared). Start with the things you never want the agent to do:

```md
# Agent rules

- Only touch the files and hosts named in the task. Nothing else.
- Keep artifacts in `work/`; results in `solution/`. `files/` is read-only.
- Never write outside this challenge folder.
- A challenge is solved only with a validated flag in `solution/flag.txt`.
```

Write those four lines yourself, in your own words. If you cannot state your
scope in four lines, the harness will not enforce it.

**Verify:** `opencode run "quote the rules you were given"` — the four lines
should come back.

---

## Step 2 — Model and provider, nothing else

Write `.opencode/opencode.jsonc` with the smallest config that works. This
workshop uses **free-tier models only**. The endpoint URL and the API key are
placeholders for now; they are added after the tests, when the instructor
gives you the values:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "omnirouter/beam-free",
  "providers": {
    "omnirouter": {
      "env": ["OMNIROUTER_API_KEY"],
      "package": "@opencode/ai/providers/openai-compatible",
      "settings": { "baseURL": "https://ai-router.42security.io/v1" },
      "models": {
        "beam-free": {
          "modelID": "opencode-go/beam-free",
          "name": "Beam Free (no cost)",
          "limit": { "context": 200000, "output": 32768 }
        },
        "longcat-2-5-free": {
          "modelID": "opencode-go/longcat-2.5-free",
          "name": "LongCat 2.5 Free (no cost)",
          "limit": { "context": 200000, "output": 32768 }
        },
        "glm-5-3": {
          "modelID": "opencode-go/glm-5.3",
          "name": "GLM 5.3",
          "limit": { "context": 1000000, "output": 131072 }
        },
        "deepseek-v4-1-flash": {
          "modelID": "opencode-go/deepseek-v4.1-flash",
          "name": "DeepSeek V4.1 Flash",
          "limit": { "context": 1000000, "output": 384000 }
        }
      }
    }
  }
}
```

Export the key in the shell you start OpenCode from, never in the file:
`export OMNIROUTER_API_KEY="..."`. The four models above are the free tier for this workshop. Paid models are
not configured here.

Do not add agents or commands yet. Get the model working alone.

**Verify:** `opencode models` lists your model, and one prompt answers.

**Compare:** `.opencode/opencode.jsonc` — it also lists paid models, model pins,
maintenance agents and permissions. The guide needs none of those to start.

Common failure: missing `env` name or a `modelID` that the endpoint does not
know. The error is usually a 404 or "authentication required".

---

## Step 3 — Your first agent (the solver)

Create `.opencode/agents/ctf.md`. The frontmatter must **name the thing**:

```md
---
description: <one sentence: what this agent is for>
mode: all
---

<your prompt>
```

Write the prompt in four sections, in your own words:

1. **Role** — "you are a CTF player and a teacher; show your reasoning".
2. **Ground rules** — scope, read-only inputs, no paste, verify flags.
3. **Method** — your own loop (recon → classify → plan → exploit → capture)
   with the tools you expect it to use.
4. **Output** — how to start and end a solve: notes file, one-line usage
   report, where the flag goes.

Keep it under 45 lines. If it needs more, you are encoding a cheat sheet, not a
contract.

**Verify:** `opencode run --agent ctf "show me your ground rules and your loop"`.

**Compare:** `.opencode/agents/ctf.md`. Steal *ideas* from the structure (e.g.
the cost/usage rule), never the text.

---

## Step 4 — Your first command

Commands are prompt templates. Write `.opencode/commands/solve.md`:

```md
---
description: <what it does>
agent: ctf
---

<template that uses $ARGUMENTS>
```

A good template does five things: states the task, restricts scope, names the
inputs, names the outputs, and says when to stop. Add a second command of your
own — a `/writeup` that turns the session into `solution/writeup.md` is a good
exercise, because it forces you to decide what a writeup must contain.

**Verify:** in the TUI, `/solve <something small>`; then check that
`work/` and `solution/` were written where you said.

**Compare:** `.opencode/commands/solve.md`, `writeup.md`.

---

## Step 5 — Your first skill

A skill is a document the model loads **on demand**. Write
`.opencode/skills/my-technique/SKILL.md`:

```md
---
name: My Technique
description: Use when <very specific situation>
---

<steps, commands, pitfalls>
```

The description is the only text the model sees before loading it: make it
specific ("when the binary is statically linked and has no canary"), not
("for pwn").

**Verify:** ask the agent to "use the My Technique skill on this file" and see
whether it loads it (`/skills` or the tool call in the transcript).

**Compare:** `.opencode/skills/ctf-methodology/` and the vendored catalogue.
The orchestration idea — one skill that *routes* to one category skill — is
worth copying conceptually: it keeps prompts small.

---

## Step 6 — Permissions: decide what is forbidden, then test it

Add a `permissions` list. The rule that matters is **last match wins**, so
write the broad allow first, then the exceptions:

```jsonc
"permissions": [
  { "action": "*", "resource": "*", "effect": "allow" },
  { "action": "shell", "resource": "sudo *", "effect": "deny" },
  { "action": "shell", "resource": "rm -rf *", "effect": "deny" }
]
```

Then write one "policy" for the things an approval must never override
(`policies` are binary and cannot be "allowed always") — typically reading your
own SSH keys or cloud credentials.

**Verify:** ask the agent to run `sudo id` and `rm -rf /tmp/x` and watch both
denied; then run something harmless and confirm no prompt.

**Compare:** `.opencode/opencode.jsonc` (`permissions`, `policies`).

---

## Step 7 — Subagents, and why they are not "more agents"

Write two small subagents with `mode: subagent`:

- `recon`: read-only, cheap model, enumerates and reports hypotheses.
- `hint`: no shell, no web, one nudge per call.

Then restrict the solver so it may launch **only these two**:

```yaml
permissions:
  - action: subagent
    resource: "*"
    effect: deny
  - action: subagent
    resource: "recon"
    effect: allow
```

**Verify:** `opencode run --agent recon "enumerate <file>"` returns a report,
and the solver cannot launch `general`.

**Compare:** `.opencode/agents/recon.md`, `hint.md`, `ctf.md`.

Design question to answer in your own prompt: what must `hint` be unable to do?
(Our answer: shell and web, because finding a writeup spoils the challenge.)

---

## Step 8 — A guard plugin (the only real enforcement)

Prompts are advice; a plugin is a check. Write
`.opencode/plugins/guard/index.ts` with `Plugin.define` and register a
permission hook that denies `edit` actions outside the start directory and
inside `files/`. Then write an **offline test** that loads the plugin with a
stubbed host module and asserts the deny/allow matrix — including `..`, absolute
paths and sibling prefixes (`/a/b-evil` vs `/a/b`).

```sh
node scripts/test-guard.mjs
```

**Verify:** your test fails when you remove a rule, and passes when you restore
it. Test the *normalization*, not just the happy path.

**Compare:** `.opencode/plugins/challenge-guard/index.ts`,
`.opencode/scripts/test-challenge-guard.mjs`.

Then add the second check, the one that makes scope concrete: an allowlist
(`targets.json`) of host + optional port + authorization note, enforced on
`shell` and `webfetch`. Requirements to get right:

- missing file or empty list means **nothing remote** (fail closed);
- a command with no detectable host stays allowed — say so in the docs;
- ports can be restricted per host; loopback is a separate switch;
- test the deny path (`nc` to an unlisted host, URL to an unlisted domain) and
  the allow path, not just one of them.

**Compare:** `.opencode/plugins/scope-guard/index.ts`,
`.opencode/scripts/test-scope-guard.mjs`, `.opencode/targets.json`.

Finally, decide what the harness does when a target *talks to the agent*
("agents, do not solve this"): quote it and stop, or ignore it. Write that rule
down in `AGENTS.md` — the plugin intentionally does not guess, because
auto-obeying a page and auto-ignoring it are both failures, in opposite
directions.

---

## Step 9 — Workspace and scaffolding

Decide the layout once:

```text
<EVENT>/<challenge>/{files,work,solution}
```

Write your own `scripts/new-challenge.sh` that creates it, refuses bad names,
and records the event's **flag format** in the event README. Make it idempotent
and test it twice.

**Verify:** scaffold an event with a non-guessable flag format (e.g.
`flagai{}`), then a second challenge without the flag argument and confirm it
inherited the format.

**Compare:** `.opencode/scripts/new-challenge.sh` (and the `.ps1` port).

Why this matters: the flag format lives in the event README, so the agent reads
it instead of inferring it from the folder name.

---

## Step 10 — Visibility: model, tokens, cost, time

Write a small script that reads OpenCode's local database (read-only) and
reports, per challenge directory: model, steps, tokens, cache reads, cost and
elapsed time. Add a `--since <epoch>` window so one solve can be measured
exactly. Then put the rule in your agent prompt:

- record `date +%s` at the start of a solve;
- at the end report one line: model · steps · tokens · cost · solved in.

**Verify:** run the script with and without `--since` on the same session; the
windowed number must be smaller. Then check that the agent's final message
contains the line.

**Compare:** `.opencode/scripts/usage.py`, `.opencode/pricing.json`, and the
"Cost and usage" section of `.opencode/agents/ctf.md`.

Do not invent prices: report "recorded" (what the database has, often $0) and
"estimated" (from a pricing file you filled in) separately.

---

## Step 11 — Regression tests for the kit itself

Write a validator that checks what you keep breaking by hand:

- agent/command frontmatter fields are from the allowed set;
- `agent:` references exist; `model:` references resolve in the config;
- commands have a non-empty body;
- no agent-level rule re-enables globally denied commands.

Run it after every edit, in CI if you have it.

**Verify:** break one reference on purpose (`model: nope/nope`) and confirm the
validator fails with a useful message.

**Compare:** `.opencode/scripts/validate.py`.

---

## Step 12 — Decide what you are *not* building

A workshop harness is not a competition platform. Before you call it done,
write down the gaps and their cost — from the "Not included" section of the
root README:

| Gap | Why it matters | What it would take |
| --- | --- | --- |
| Execution isolation | challenges run on your machine | container/VM with no network |
| Scope enforcement for shell | "only this host" is prose | per-challenge target allowlist |
| Scoring loop | you cannot prove a solve | compare against reference flags |
| Toolchain pinning | "works on my machine" | versioned image |

Every one of these is a small project. Knowing which is missing is part of
owning the harness.

---

## Definition of done

Your harness is yours when all of these hold:

- [ ] `AGENTS.md` states scope in four lines you wrote.
- [ ] One agent, one prompt, under 45 lines, written by you.
- [ ] One command template with `$ARGUMENTS`; outputs land in `work/`/`solution/`.
- [ ] One skill with a description specific enough to trigger itself.
- [ ] Deny list tested live (`sudo`, `rm -rf` refused).
- [ ] Two subagents, restricted to themselves.
- [ ] Guard plugin with a passing offline test, including path normalization.
- [ ] Scope allowlist enforced on shell/webfetch, with its own offline test.
- [ ] Scaffold script with a configurable flag format.
- [ ] Usage/time report, and an agent rule to close with it.
- [ ] Validator passing.
- [ ] A written list of what you deliberately left out.

Then — and only then — open `.opencode/` and diff your design against it. Where
it differs, ask which choice *you* can defend.

## If it breaks

| Symptom | First thing to check |
| --- | --- |
| Agent ignores a rule | is the rule in `AGENTS.md` or only in the command? |
| Tool call denied unexpectedly | last matching permission rule, then policies |
| Skill never loads | description too vague or missing |
| Plugin has no effect | was it loaded? `opencode plugin list`, then check the hook action name |
| Cost shows $0 | pricing not configured — that is expected, not a bug |
| Time looks too large | no start epoch recorded; use `--since` |
| Agent writes outside the folder | guard plugin scope is the *start directory*; start inside the challenge |
