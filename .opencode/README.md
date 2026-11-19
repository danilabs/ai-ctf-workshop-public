# OpenCode kit for the AI-CTF workshop

The complete configuration guide: what every file does, why it is set that
way, and how to add a new **model, agent, command, skill, tool or MCP server**.

Everything targets OpenCode V2 (verified against `opencode v2.3.0` and the
V2 docs at <https://opencode.ai/docs/>).

Contents: [File map](#file-map) · [Install](#install) ·
[Using the harness](#using-opencode-as-the-harness) ·
[Provider and models](#provider-and-models) · [Agents](#agents) ·
[Commands](#commands) · [Skills](#skills) · [Tools](#tools) ·
[MCP servers](#mcp-servers) · [Permissions and policies](#permissions-and-policies) ·
[Session tuning](#session-tuning) · [Cost and usage](#cost-and-usage) ·
[Scope allowlist](#scope-allowlist-and-policy-notices) ·
[CTF switches](#ctf-specific-switches) ·
[Token budget](#token-budget-one-model-per-agent) ·
[Config line by line](#appendix-the-config-line-by-line) ·
[Validate](#validate-the-kit) · [Presenter notes](#presenter-notes)

> This README documents the reference kit. If you want to **write your own
> harness instead of copying it**, start with [`../HARNESS.md`](../HARNESS.md).

---

## File map

```text
.opencode/
├── opencode.jsonc                 provider, models, permissions, policies,
│                                  skills discovery, session tuning
│   (no agents or commands are shipped — build your own, see below)
├── skills/
│   ├── ctf-methodology/SKILL.md   workshop overlay (loop, safety, routing)
│   └── vendor/ctf-skills/         ljagiello/ctf-skills (MIT), 12 skills
├── plugins/
│   ├── challenge-guard/index.ts   denies writes outside the start folder
│   └── scope-guard/index.ts       denies shell/webfetch to unlisted hosts
└── scripts/
    ├── validate.py                schema checker for agents/commands/skills
    ├── new-challenge.sh           scaffold <EVENT>/<challenge>/ folders
    ├── new-challenge.ps1          same, for Windows (pwsh)
    ├── test-challenge-guard.mjs   offline test of the guard deny/allow matrix
    ├── test-scope-guard.mjs       offline test of the target allowlist
    ├── usage.py                   tokens/model/cost/time report per challenge
    └── setup-playwright-mcp.sh    install/enable the browser MCP

pricing.json                       USD per 1M tokens, used by usage.py
targets.json                       hosts the agent may touch (authorization notes)
AGENTS.md                          repo-wide instructions (scope, conventions)
install.sh / install.ps1           one-command setup for attendees
```

Config is JSONC (comments allowed). OpenCode hot-reloads it — no restart.

---

## Install

```sh
./install.sh                     # Linux / macOS
.\install.ps1                    # Windows PowerShell
```

Both scripts install OpenCode if missing, copy `.opencode/`, `AGENTS.md` and
the `CTF/` sample event into the current directory (or a directory passed as an
argument), store the API key and verify the provider. Flags: `--force`/`-Force`
overwrite, `--key`/`-Key` pass the key non-interactively.

```sh
./install.sh ~/ctf-challenges          # install the kit there instead
```

---

## Using OpenCode as the harness

Start OpenCode **inside the challenge folder**, not at the repo root: config,
agents, skills and `AGENTS.md` are discovered upward automatically, and every
relative path then lands inside the challenge.

### Challenge workspace

```text
<EVENT>/README.md                  rules, flag format, description
<EVENT>/<challenge>/
├── README.md                      statement, category, points, connection
├── files/                         original challenge files (read-only)
├── work/                          scripts, dumps, notes, payloads
└── solution/
    ├── writeup.md                 final explanation
    └── flag.txt                   captured flag
```

Scaffold a new one (idempotent, creates the event README too):

```sh
.opencode/scripts/new-challenge.sh ctf-ai crypto-01 crypto        # Linux / macOS
pwsh .opencode/scripts/new-challenge.ps1 ctf-ai crypto-01 crypto  # Windows
```

Any event name and flag format work: `--flag 'flagai{}'` (or the bare prefix
`--flag flagai`) sets the format in `<EVENT>/README.md` instead of the default
`<EVENT>{...}`. Later challenges of that event inherit the recorded format, so
only the first scaffold call needs the flag.

```sh
.opencode/scripts/new-challenge.sh ctf-ai web-01 web --flag 'flagai{}'
.opencode/scripts/new-challenge.sh ctf-ai crypto-01 crypto   # flagai{...} inherited
```

The challenge brief can be passed on the command line instead of editing the
README afterwards:

```sh
.opencode/scripts/new-challenge.sh ctf-ai crypto-01 crypto \
  --title 'Baby RSA' --description 'Small e, same message to three people.' \
  --connection 'nc 10.0.0.5 1337' --points 100 --author anon
```

`--title`, `--description` (quoted, newlines allowed), `--connection` (alias
`--target`), `--points` and `--author` replace only their marker lines; omitted
fields stay `[TO FILL]`. The PowerShell equivalents are `-Title`,
`-Description`, `-Connection` (alias `-Target`), `-Points`, `-Author`.

Interactive alternative: start OpenCode at the repo root and use `/new-ctf`.
It asks for the event schema (name, flag format, dates, format, policies and
optionally a first challenge), runs the same script, then replaces the
`[TO FILL]` markers with the answers. It must run at the repo root — the write
guard blocks creating an event from inside a challenge folder. Add
`--event-only`/`-EventOnly` to the script when you want the event without a
first challenge.

The agents are instructed to keep **every artifact under the challenge
folder**: `work/` while solving, `solution/` for the writeup and flag. Nothing
is written to the repo root or the event folder.

A local plugin, `.opencode/plugins/challenge-guard/index.ts`, enforces it: when
you start OpenCode inside a folder, `edit`/`write`/`patch` calls outside that
folder are denied, and `files/` is read-only (work on copies in `work/`). If
you start at the repo root, the whole repo is writable, so kit maintenance is
unaffected. Reads, shell commands and scans are not restricted by the guard.

Check the guard's deny/allow matrix offline (no model or network needed):

```sh
node .opencode/scripts/test-challenge-guard.mjs
```

### Day-to-day loop

```sh
cd CTF/xor-01
opencode
```

- `/models` — switch model for this session (default `beam-free`, no cost).
- `/connect` — add an account or search provider (not needed for the router).
- `/solve <challenge>` — hand the solver the challenge.
- `@path/to/file` — attach a specific file to a prompt.
- `/recon <target>` — background enumeration on the cheap model.
- `/hint` — a nudge without spoilers; ask again for level 2/3.
- `/writeup` — write `solution/writeup.md` from the finished session.
- `/new-ctf` — scaffold a new event interactively; run it at the kit root, not
  inside a challenge folder.
- `/undo` / `/redo` — restore files and conversation after a bad step.
- `/reload` — force a full config/agent/skill reload (saves reload
  automatically).
- `/mcps` — inspect, connect or authenticate MCP servers.

When you add your own `ctf` agent and make it the default, it should keep every
artifact in `work/` inside the current challenge folder — that is the hard rule
in `AGENTS.md`. Subagents such as `recon` and `hint` can run in the background
while you keep working.

### Non-interactive and headless use

```sh
opencode run "Solve the crypto challenge in chall.py"
opencode run --agent recon "Enumerate 10.10.10.5"
opencode run --model omnirouter/kimi-k2-7-code "Patch exploit.py"
opencode run --continue
opencode run --session ses_abc123 "Try the second hypothesis"
opencode run --file ./capture.pcap "Analyze this capture"
```

### Inspection commands

```sh
opencode models            # what /models can offer in this project
opencode mcp list          # configured MCP servers and connection state
opencode stats             # sessions, tokens and cost per model
opencode service status    # background service health
opencode service restart   # only if the service is stuck
```

### Habits that matter with a CTF harness

- **One challenge, one session.** Keep the context focused; start fresh for the
  next challenge instead of dragging old tool output along.
- **Scope before scanning.** Tell the agent the exact host/port or files; it is
  instructed not to touch anything else.
- **Let recon be cheap.** Use `/recon` (Haiku) for enumeration and keep the
  frontier model for reasoning and exploit development.
- **Ask for hints, not answers** when the goal is learning: `/hint` cannot run
  shell or browse the web.
- **Verify flags yourself.** The agent validates the format, not the scoreboard.
- **Use sessions and Git.** `/undo` restores tracked files in a Git worktree;
  for anything important, commit or copy before experimenting.
- **Rotate the router key after the event.**

Windows may block the script; allow it for the current process only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Manual setup: install OpenCode, copy the kit, then
`export OMNIROUTER_API_KEY="sk-..."` (or `setx OMNIROUTER_API_KEY "sk-..."`).

---

## Provider and models

The kit talks to an OpenAI-compatible router. The key is read from the
environment (`{env:OMNIROUTER_API_KEY}`), never stored in the repo.

```jsonc
"providers": {
  "omnirouter": {
    "name": "42Security OmniRouter",
    "env": ["OMNIROUTER_API_KEY"],
    "package": "@opencode/ai/providers/openai-compatible",
    "settings": { "baseURL": "https://ai-router.42security.io/v1" },
    "compatibility": { "reasoningField": "reasoning_content" },
    "models": { ... }
  }
}
```

`compatibility.reasoningField` matters: the router streams reasoning in
`reasoning_content`, and without this OpenCode would lose mid-session
reasoning.

### Curated models

| Key                   | Model              | Notes                        |
| --------------------- | ------------------ | ---------------------------- |
| `beam-free`           | Beam Free (default)| **Free**, 200k ctx, tools+reasoning |
| `longcat-2-5-free`    | LongCat 2.5 Free   | **Free**, fallback if Beam is rate limited |
| `glm-5-3`             | GLM 5.3            | **Free tier** (workshop set), 1M ctx, reasoning |
| `deepseek-v4-1-flash` | DeepSeek V4.1      | **Free tier** (workshop set), long analyses, 1M ctx |
| `haiku-5-5`           | Claude Haiku 5.5   | optional paid upgrade, fast |
| `kimi-k2-7-code`      | Kimi K2.7 Code     | optional paid upgrade, exploit scripting |
| `qwen3-8-flash`       | Qwen 3.8 Flash     | optional paid upgrade, open model |
| `gpt-6-luna`          | GPT-6 Luna (off)   | 400s on tool-result turns; `disabled: true` so it never appears in `/models` |

The **default is free**: `beam-free` is the OpenCode Go free tier routed
through the gateway — zero cost, tool calling, reasoning, streaming. The kit
also pins every subagent and maintenance call to it, so an out-of-the-box
session costs nothing. Switch to a paid model with `/models` for hard
challenges, or pin one per agent.

Free-tier notes:

- Free routes are shared capacity. If `beam-free` is slow or rate limited,
  switch to `longcat-2-5-free`; if both fail, a paid upgrade keeps the
  workshop moving.
- Some free router routes are gated for privacy reasons (for example
  `opencode-go/iceman-contributor-free` requires opting in to training on your
  data; the UncloseAI beta is closed). Do not send sensitive data to them.
- Free models are weaker at long exploit chains. For hard pwn/crypto, try
  `glm-5-3` (reasoning, 1M ctx) first; `kimi-k2-7-code` (paid, scripting) is the
  optional upgrade. The GLM 5.3 and DeepSeek V4.1 free-tier status comes from
  the workshop instructor; confirm it on your account before relying on it.

All active models were tested end to end (tool loop + streaming) on 2026-11-14.
The router's `aug/*`, `zc/*`, `cxa/*` and `cfp/*` routes were returning upstream
502/503 at that time. `gpt-6-luna` stays documented but disabled: a broken route
in `/models` is worse than an absent one. Remove `disabled` if it is fixed.

### Add a model

Add an entry under `providers.omnirouter.models`. The key is the ID you type in
OpenCode (`omnirouter/<key>`); `modelID` is what is sent to the router.

```jsonc
"sonnet-4-6": {
  "modelID": "opencode-go/claude-haiku-5-5",
  "name": "My alias",
  "limit": { "context": 1000000, "output": 128000 }
}
```

Then `python3 .opencode/scripts/validate.py` (it checks the reference resolves)
and pick it with `/models` or `--model omnirouter/<key>`.

### Add a provider

```jsonc
"providers": {
  "my-provider": {
    "name": "My Endpoint",
    "env": ["MY_PROVIDER_API_KEY"],
    "package": "@opencode/ai/providers/openai-compatible",
    "settings": { "baseURL": "https://llm.example.com/v1" },
    "models": {
      "my-model": { "modelID": "real-model-id", "name": "My Model" }
    }
  }
}
```

Other packages exist for native APIs (`@opencode/ai/providers/anthropic`,
`.../openai`, `.../google`, `.../openrouter`). A model reference is always
`provider/model`; the model part may itself contain `/`.

---

## Agents

An agent = system prompt + model + permissions + display metadata.

### Schema (V2 fields only)

| Field         | Values / shape                                              | Purpose |
| ------------- | ----------------------------------------------------------- | ------- |
| `description` | string                                                      | Shown to the model choosing a subagent — required for subagents |
| `mode`        | `primary`, `subagent`, `all`                                | Where it can run |
| `model`       | `provider/model[#variant]`                                  | Subagents use this instead of inheriting |
| `system`      | string (JSON only; body in Markdown)                        | System prompt |
| `permissions` | ordered list of `{action, resource, effect}`                | Appended after global rules |
| `steps`       | positive integer                                            | Max model steps per turn |
| `hidden`      | boolean                                                     | Hide from listings (not a security boundary) |
| `color`       | `#rrggbb`                                                   | UI color |
| `disabled`    | boolean                                                     | Remove the agent |

Do not use V1 fields (`temperature`, `maxSteps`, `tools`, `permission`).

### Current agents

None are shipped. This is a skeleton harness: build your own agents under
`.opencode/agents/<id>.md` (or in `opencode.jsonc` under `agents.<id>`). The
examples in HARNESS.md steps 3 and 7 use `ctf` (solver), `recon` and `hint`
(subagents). The `crypto` specialist from earlier revisions is a good template
for a scoped subagent.

### Add an agent

Create `.opencode/agents/<id>.md` (nested paths become `team/<id>`):

```md
---
description: Explains pwn exploits step by step for the attendee
mode: subagent
model: omnirouter/beam-free
color: "#7b8cde"
steps: 12
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: subagent
    resource: "*"
    effect: deny
---

You explain heap exploitation techniques with small, runnable examples.
```

Or define it in `opencode.jsonc` under `agents.<id>` with the same fields
(`system` instead of a body). 

Rules that bite:

- Agent rules are **appended after** global rules, so a broad
  `{ "action": "shell", "resource": "*", "effect": "allow" }` inside an agent
  would re-enable `rm -rf`/`sudo`. Don't add it — the validator rejects it.
- Set `description` on subagents, or the solver cannot decide when to use them.
- To use one immediately: `opencode run --agent <id> "..."`.

---

## Commands

Slash commands are prompt templates. **Add one** by creating
`.opencode/commands/<name>.md`; nested paths make `/team/<name>`.

| Field         | Purpose |
| ------------- | ------- |
| body          | Prompt template (`$ARGUMENTS`, `$1`, `$2`…) |
| `description` | Text shown in command lists |
| `agent`       | Agent to run the command with |
| `model`       | Model override (`provider/model[#variant]`) |
| `subagent`    | `true` runs it in a background child session |

Current commands:

None are shipped. Build your own under `.opencode/commands/<name>.md`
(HARNESS.md steps 4 and 10). The examples used in the workshop are `/solve`,
`/recon`, `/hint`, `/writeup`, `/new-ctf` and `/cost`.

Example — a new command that runs purely from the template:

```md
---
description: Triage a challenge bundle and classify it
agent: ctf
---

Read $ARGUMENTS, identify the challenge category and list the three most
likely vulnerability classes. Do not exploit anything yet.
```

Shell blocks (`!` + backticks) run when the command expands, outside the
agent's permission flow — only use them from trusted templates.

---

## Skills

A skill is reusable instructions the model loads on demand. Only its ID, name
and `description` are advertised; the body enters context only when loaded, so
adding skills is cheap.

Discovery (no config needed): `.opencode/skills/`, `~/.config/opencode/skills/`,
and the compatibility paths `.claude/skills/`, `.agents/skills/`. A skill is
either `skills/<id>.md` at the source root or `skills/<id>/SKILL.md`. Nested
IDs come from the leaf directory (`skills/team/review/SKILL.md` → `review`).

### Current skills

- `ctf-methodology` — the workshop overlay: loop, flag hygiene, safety, and
  routing to one category skill.
- Vendored `ljagiello/ctf-skills` (MIT, commit `a16e19a`): `solve-challenge`
  orchestrator plus `ctf-web`, `ctf-pwn`, `ctf-crypto`, `ctf-reverse`,
  `ctf-forensics`, `ctf-osint`, `ctf-malware`, `ctf-misc`, `ctf-ai-ml`,
  `ctf-similar-search`, `ctf-writeup`.

`ctf-similar-search` needs `TAVILY_API_KEY`; it is optional.

### Add a skill

```text
.opencode/skills/my-skill/
├── SKILL.md
├── references/notes.md
└── scripts/helper.py
```

```md
---
name: My Skill
description: Use when the challenge involves <specific situation>
---

Steps, commands, and pitfalls. Reference bundled files by relative path.
```

- Keep the `description` specific — it is the only text the model sees before
  loading the skill.
- `metadata: { opencode/autoinvoke: false }` (or `disable-model-invocation:
  true`) hides it from the model but keeps it loadable by ID.
- Load explicitly with `@my-skill` or the `skill` tool.
- External directories/URLs can be added with `"skills": ["../shared-skills"]`
  in the config.
- Restrict who may load a skill with permissions:
  `{ "action": "skill", "resource": "my-skill", "effect": "deny" }`.

To update the vendored catalogue, see
`.opencode/skills/vendor/ctf-skills/VENDORED.md`.

---

## Tools

Built-in tools: `read`, `glob`, `grep`, `edit`, `write`, `patch` (GPT models),
`shell`, `webfetch`, `websearch` (disabled in this kit), `question`, `skill`,
`subagent`, `execute` (Code Mode), plus the session/worktree helpers inside
`execute`.

Control them with permissions using these actions:

| Action | Resource |
| ------ | -------- |
| `read`, `edit` | Path |
| `glob` | Glob pattern |
| `grep` | Regex |
| `shell` | Command string |
| `subagent` | Agent ID |
| `skill` | Skill ID |
| `webfetch` | URL |
| `websearch` | Query |
| `question` | `*` |
| `external_directory` | Directory boundary |
| `<server>_<tool>` | MCP tool (`*`) |

Hiding a tool = deny its action. Web search is already off globally
(`websearch: false`), while `webfetch` and `curl` stay available for OSINT and
recon. To block outbound fetches too:

```jsonc
{ "action": "webfetch", "resource": "*", "effect": "deny" }
```

### Add a tool (plugin)

Custom tools come from plugins. A local plugin is auto-loaded from
`.opencode/plugins/<name>/index.ts` (or `.js`):

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "workshop.flagcheck",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.add({
        name: "flagcheck",
        description: "Validate a CTF flag format without submitting it",
        input: {
          type: "object",
          properties: { flag: { type: "string" } },
          required: ["flag"],
          additionalProperties: false,
        },
        options: { codemode: true },
        execute: async ({ flag }: { flag: string }) => ({
          content: /^[A-Za-z0-9_]+{[^}]+}$/.test(flag)
            ? `looks valid: ${flag}`
            : "does not match a common CTF flag format",
        }),
      })
    })
  },
})
```

- A plugin `setup(ctx)` can also register commands, agents, skills, MCP
  servers, providers and hooks (`ctx.command.transform`, `ctx.skill.transform`,
  `ctx.mcp.transform`, `ctx.session.hook`, …).
- Published/local plugins can be listed explicitly under `"plugins": [...]`.
- Plugin tools get their own permission action (`<namespace>_<tool>`), so you
  can allow, ask or deny them like any other tool.

---

## MCP servers

MCP adds external tools/resources (browser automation, docs search, security
tooling, …). MCP tools consume context, so add only what the workshop needs.

The kit already ships a **disabled** Playwright server for web challenges:
flip `disabled` to `false`, run `npx playwright install chromium` once, and its
tools appear as `playwright_<tool>`. Everything below is for adding more.

### Add a server

Remote (OAuth is the default for remote servers):

```sh
opencode mcp add context7 --url https://mcp.context7.com/mcp
opencode mcp list
```

Local (stdio) — everything after `--` is the command:

```sh
opencode mcp add everything -- npx -y @modelcontextprotocol/server-everything
```

Or by hand in `opencode.jsonc`:

```jsonc
"mcp": {
  "servers": {
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "@playwright/mcp"]
    },
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "oauth": false,
      "headers": { "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}" }
    }
  }
}
```

Useful fields: `disabled: true` to keep a server configured but off,
`environment`/`cwd` for local servers, `timeout` for slow tools,
`codemode: false` to expose its tools directly instead of through Code Mode.

### Example: install and enable Playwright (web challenges)

The kit already contains the entry, disabled. Requirements: **Node.js 18+** and
~200 MB for the Chromium build.

**Fast path** — one command, from the project root:

```sh
.opencode/scripts/setup-playwright-mcp.sh
```

It installs Chromium, flips `disabled` to `false` (keeping
`opencode.jsonc.bak`), and prints the next steps. Other modes:

```sh
.opencode/scripts/setup-playwright-mcp.sh --check        # state + prerequisites
.opencode/scripts/setup-playwright-mcp.sh --no-browser   # config only
.opencode/scripts/setup-playwright-mcp.sh --disable      # turn it off again
```

**Manual path** — exactly what the script does:

```sh
node --version                                  # must be v18+
npx -y playwright@latest install chromium       # one-time browser download
```

Then edit the entry (`.opencode/opencode.jsonc`):

```jsonc
"playwright": {
  "type": "local",
  "command": ["npx", "-y", "@playwright/mcp@latest", "--headless", "--isolated"],
  "disabled": false
}
```

Useful server flags (from the Playwright MCP docs):

| Flag | Effect |
| ---- | ------ |
| `--headless` | No visible window; required over SSH/containers |
| `--isolated` | In-memory profile, avoids profile locks with parallel sessions |
| `--browser chrome` | Use the installed Chrome channel instead of bundled Chromium |
| `--caps vision,pdf,devtools` | Enable opt-in tool groups (screenshots, PDF, DevTools) |

**Verify:** start OpenCode at the project root.

```sh
opencode mcp list
# ○ playwright  connected      (or: pending, then connected)
```

Inside the session, `/mcps` shows the server and its tools. Tool names are
`playwright_<tool>`; in Code Mode they appear as `tools.playwright.browser_*`.
If `mcp list` still reports the old state after enabling, run `/reload` in the
session or `opencode service restart` — the shared service caches config
briefly.

First prompt to try:

```text
Open http://challenge.local:8080, take a page snapshot, and describe the login form.
```

**Permissions:** MCP tools are ordinary permission actions. Ask before browser
actions in a shared environment:

```jsonc
{ "action": "playwright_*", "resource": "*", "effect": "ask" }
```

**Troubleshooting**

- `Executable doesn't exist` → run the `playwright install chromium` step.
- Linux missing libraries → `npx playwright install-deps chromium` needs root;
  run it yourself, not through the agent (sudo is denied by policy).
- `profile is already in use` → add `--isolated`.
- Context feels heavier → disable the server again with the script; MCP tool
  definitions cost tokens on every request.
- Windows: run the same `npx` command in PowerShell, edit the JSON by hand;
  the `.sh` helper is Linux/macOS only.

### Authenticate

```sh
opencode mcp auth context7     # or /mcps inside OpenCode
opencode mcp logout context7
```

### Control access

MCP tools are named `<server>_<tool>`. Deny one tool or a whole server with a
permission action:

```jsonc
[
  { "action": "playwright_*", "resource": "*", "effect": "ask" },
  { "action": "context7_*", "resource": "*", "effect": "deny" }
]
```

MCP **prompts** become commands named `<server>:<prompt>`, e.g.
`/context_7:find_docs react "server components"`.

---

## Permissions and policies

Permissions let a tool run (`allow`), block it (`deny`) or prompt (`ask`).
The **last matching rule wins**; with no match the default is `ask`.

Current setup:

- Base: allow-all, so the workshop flows without approval fatigue.
- Hard denials: `sudo`, `su`, `rm -rf` (and `-fr`, `-Rf`, `-r -f`), `mkfs*`,
  `dd if=* of=/dev/*`, `shutdown`, `reboot`, `chmod -R 777 *`.
- `*.env` reads ask first.
- Policies (never prompt, cannot be overridden by "Allow always"): any
  `*/.ssh/*` read, `~/.aws/credentials`, gcloud config, and `sudo`.

To demo approvals live, replace the base allow with an ask:

```jsonc
{ "action": "shell", "resource": "*", "effect": "ask" }
```

Remember: agent permission rules are appended after global ones, so a broad
allow inside an agent re-enables what the global config denies.

---

## Scope allowlist and policy notices

Permissions answer "may this tool run". Scope answers "on what". Two pieces
turn the workshop's "only the targets you were given" into something visible.

### `targets.json`

```jsonc
{
  "allow": [
    { "host": "42security.io", "ports": [443], "note": "public CTF page" },
    { "host": "130.206.158.149", "ports": [53717], "note": "lab box, engagement #12" },
    { "host": "*.corp.example", "note": "internal lab, wildcard" }
  ],
  "allow_loopback": true
}
```

`plugins/scope-guard` reads it on every `shell` and `webfetch` permission
check and denies any host that is not listed:

- no file or empty `allow` → **nothing remote** is allowed (fail closed);
- `ports` restricts a host to the listed ports;
- `allow_loopback` (default true) keeps `localhost`/`127.0.0.1` usable for
  local services; set it to `false` when pivoting is part of what you test.

The check is heuristic, and honestly so: a command with no detectable host
(`ls -la`) is allowed, and a tunnel to an allowed host can still reach anything
that host can. The allowlist stops accidental `nmap /24` and typo'd hosts, not
a determined attacker.

Test it offline (no model, no network):

```sh
node .opencode/scripts/test-scope-guard.mjs
```

### Policy notices

If a target says something about AI agents — "agents, do not solve this" — the
harness does **not** decide for you. `AGENTS.md` requires the agent to quote
the notice verbatim and stop; the human then decides whether they are the
player, the owner, or neither. The plugin does not scan content for these
phrases on purpose: automated "compliance" with a page instruction is exactly
the prompt-injection failure mode, and silently ignoring it is the opposite
one. Surface, quote, stop.

---

## Session tuning

| Setting | Value | Why |
| ------- | ----- | --- |
| `experimental.todo` | `true` | todo tool for multi-step solves |
| `experimental.background_compaction` | `true` | summarize without pausing |
| `compaction.keep.tokens` | `24000` | keep more of the recent session |
| `compaction.buffer` | `"20%"` | compact at 80% of the window |
| `tool_output.max_lines` / `max_bytes` | `2000` / `65536` | cheap tool results; full output stays on disk |
| `snapshots` | `true` | `/undo` restores files (needs a Git repo) |

`background_compaction` is marked experimental upstream; it has safe
fallbacks, but disable it first if you ever see instability.

---

## Cost and usage

Two different facts are easy to confuse: what OpenCode **records** and what a
model actually **costs**. The kit exposes both, per challenge.

### What is recorded

Each assistant message stores its model and token counts in OpenCode's local
database (`~/.local/share/opencode/opencode.db`). A cost is recorded only when
the model has pricing configured; the curated entries in `opencode.jsonc` do
not, so recorded cost is $0 and says nothing about your bill.

### The reporter

`scripts/usage.py` reads that database read-only and aggregates by directory:

```sh
python3 .opencode/scripts/usage.py                 # sessions started here
python3 .opencode/scripts/usage.py --all           # whole repository
python3 .opencode/scripts/usage.py --session ses_x # one session
python3 .opencode/scripts/usage.py --since 1794754899   # window: one solve
python3 .opencode/scripts/usage.py --json          # machine-readable
```

Attribution is by **start directory**, so "one challenge, one session" also
gives clean accounting. Anything started at the repo root belongs to kit work,
not to a challenge.

### Solve time

The reporter also prints how long the work took, from the first message in the
window to the last one:

```text
time: 12m 34s   (2026-11-15 16:02:10Z -> 2026-11-15 16:14:44Z)
```

- Without `--since`, that is the session span and may include earlier work in
  the same session.
- The `ctf` agent records `date +%s` at the start of a solve and passes it as
  `--since`, so the window covers exactly that challenge.
- `/cost <epoch>` does the same on demand.

### Estimated cost

`.opencode/pricing.json` holds USD per 1 million tokens for each
`provider/model`:

```json
"omnirouter/haiku-5-5": { "input": 3, "output": 15, "cache_read": 0.3 }
```

Fill it from your provider's price list; reasoning tokens are billed at the
output rate. Until entries are non-zero the reporter prints "not configured"
instead of guessing.

### Who reports it

- `/cost` runs the report for the current challenge on demand.
- The `ctf` agent ends every solve with one line:
  `usage: <model> · <steps> steps · in <n> / out <n> / cache-read <n> · cost <value> · solved in <time>`
- `AGENTS.md` repeats the rule, so ad-hoc sessions follow it too.

## CTF-specific switches

These are the settings that exist because this is a CTF kit, not a coding
assistant:

| Setting | Value | Why |
| ------- | ----- | --- |
| `websearch` | `false` | No guaranteed provider, writeup spoilers, and a tool schema saved on every request |
| `formatter` | `false` | A formatter can break payload bytes, fixtures and exploit scripts |
| `watcher.ignore` | `node_modules`, `.venv`, `__pycache__`, `dist`, `build`, `target` | Keeps the watcher quiet during long solves; `work/` stays watched |
| `references.ctf-skills` | vendored playbook tree | Named, read-only access to every category's notes and scripts |
| `mcp.servers.playwright` | `disabled: true` | Ready for web challenges without paying startup/context cost until needed |

### Why websearch is disabled

- The router has no guaranteed search provider; an unavailable provider turns
  into a confusing failure mid-challenge.
- Search results frequently include challenge writeups — instant spoilers in a
  teaching workshop.
- The tool schema is sent on every request; removing it saves tokens for every
  agent, including the cheap subagents.
- CTF work does not need it: `webfetch` and `shell` + `curl` still reach
  specific URLs, and `ctf-similar-search` uses the Tavily API directly when an
  attendee brings `TAVILY_API_KEY`.

Re-enable it for OSINT-heavy sessions:

```jsonc
"websearch": { "provider": "random" }
```

then connect a provider with `/connect`, or export `EXA_API_KEY`,
`FIRECRAWL_API_KEY`, `TAVILY_API_KEY`, `PARALLEL_API_KEY` or
`TINYFISH_API_KEY` before starting OpenCode.

### Why the watcher ignores build trees

Exploit iterations write constantly; re-indexing `node_modules`, virtualenvs
and PyInstaller output adds noise without value. `work/` is intentionally not
ignored, because that is where the agent writes and edits scripts.

### Why a named reference

`references.ctf-skills` exposes the vendored tree as a browsable alias
(`ctf-skills`) instead of making the model guess paths. It is read-only by
convention: skill files are updated by re-vendoring, not in place.

### Why Playwright is preconfigured but disabled

Web challenges often need a real browser (JS-rendered apps, auth flows,
websockets). Keeping the server configured means enabling it is a one-line
change (`"disabled": false`) instead of remembering the command. MCP tools are
listed in context per request, so leaving it enabled for every challenge would
cost tokens that most challenges do not need.

---

## Token budget: one model per agent

| Agent | Model | Why |
| ----- | ----- | --- |
| `ctf` | session model (`beam-free`) | free by default; pick a paid model for hard work |
| `recon` | `beam-free` | enumeration is high-volume, no cost |
| `hint` | `beam-free` | one-paragraph answers, no cost |
| `crypto` | `deepseek-v4-1-flash` | crypto analysis and solver scripts (free tier, 1M ctx) |
| `compaction`, `title`, `summary` | `beam-free` | run constantly, keep them free |

Further savings already in place: the default session, subagents and
maintenance all run on the free tier, so a workshop session costs nothing;
subagents run in fresh child contexts; `/recon` and `/hint` run in the
background; tool results are capped; the solver prompt forbids pasting output;
only one category skill is loaded per challenge.

Change a pin in the agent frontmatter (`model:`) or in
`agents.<id>.model` in the config. Override for one run:
`opencode run --agent recon --model omnirouter/qwen3-8-flash "..."`.
If a pinned model is down, delete its `model:` line to inherit the session
model.

Measure with `opencode stats`.

---

## Appendix: the config, line by line

This walks through `.opencode/opencode.jsonc` in order. It is project config:
OpenCode applies it after global config and before system/managed config, and
hot-reloads it on save.

### `$schema`

```jsonc
"$schema": "https://opencode.ai/config.json"
```

Enables editor validation and autocomplete. Purely an editor aid; OpenCode
does not fetch it. This is the V2 schema — never add V1 fields like
`permission`, `bash`, `task`, `temperature` or `maxSteps`.

### `model` — the default model

```jsonc
"model": "omnirouter/beam-free"
```

- Format is `provider/model`; the provider part ends at the first `/`.
- This is only the default for **new** sessions. A session keeps whatever the
  user picked with `/models`; switching later does not rewrite the file.
- If the model is unavailable at startup, OpenCode falls back to the newest
  available supported model rather than failing.
- The root default does **not** keep a `#variant`. Select variants per agent,
  per command, or per run (`--model provider/model#high`).

Why Beam Free: it is the OpenCode Go free tier exposed by the gateway — tool
calling, reasoning and streaming verified, 200k context, and no cost. That
keeps the workshop free by default. The workshop free set is `beam-free`,
`longcat-2-5-free`, `glm-5-3` and `deepseek-v4-1-flash`. `/models` also lists
optional paid upgrades (`haiku-5-5`, `kimi-k2-7-code`, `qwen3-8-flash`) for when a
challenge needs more power.

### `providers["omnirouter"]`

```jsonc
"providers": {
  "omnirouter": {
    "name": "42Security OmniRouter",
    "env": ["OMNIROUTER_API_KEY"],
    "package": "@opencode/ai/providers/openai-compatible",
    "settings": { "baseURL": "https://ai-router.42security.io/v1" },
    "compatibility": { "reasoningField": "reasoning_content" },
    "models": { ... }
  }
}
```

| Field | Meaning |
| ----- | ------- |
| `name` | Display name in `/models` and error messages |
| `env` | Ordered env vars that may supply the credential. The first one set wins; the key never goes in the file |
| `package` | Runtime that speaks the API. `openai-compatible` for anything that implements OpenAI's request format |
| `settings.baseURL` | Endpoint including `/v1`. `settings` is package-specific |
| `compatibility` | Request/response quirks shared by every model of this provider |
| `models` | Models to expose, keyed by the OpenCode-side ID |

**Why `reasoningField`:** the router streams chain-of-thought in the
`reasoning_content` field of streamed deltas. Without this, OpenCode would not
parse it and could not restore prior reasoning on later turns. OpenCode
recognizes `reasoning`, `reasoning_content` and `reasoning_text`; the field is
also used when sending prior assistant messages back.

**Why a custom provider at all:** the router is not in models.dev, so it needs
a `package`, a `baseURL` and at least one declared model. This also keeps the
workshop independent of any single vendor.

### `providers["omnirouter"].models`

Each entry looks like:

```jsonc
"haiku-5-5": {
  "modelID": "opencode-go/claude-haiku-5-5",
  "name": "Claude Haiku 5.5",
  "limit": { "context": 1000000, "output": 128000 }
}
```

- **Map key** (`haiku-5-5`) is the ID OpenCode uses: `omnirouter/haiku-5-5`.
  It is what agents, commands and `/models` reference.
- **`modelID`** is the string actually sent to the router. Aliasing lets the
  router's IDs contain `/` (`opencode-go/claude-haiku-5-5`) without ambiguity
  in `provider/model` references.
- **`name`** is the friendly label in the picker.
- **`limit`** is `{ context, output }` in tokens. Declare real values: the
  context limit drives compaction and overflow recovery, and the output limit
  caps the request. Unknown models otherwise default to 200k/32k, which would
  underuse or over-ask the router.
- Optional per model: `capabilities` (tools, vision, reasoning/effort),
  `cost`, `variants`, `settings`, `headers`, `body`, `disabled`. We declare
  only what we verified; wrong capabilities are worse than defaults.

Current set: `beam-free` (default) and `longcat-2-5-free`, plus `glm-5-3` and
`deepseek-v4-1-flash` (free tier per the workshop instructor), then optional
paid upgrades `haiku-5-5`, `kimi-k2-7-code`, `qwen3-8-flash`. `gpt-6-luna` is present but `disabled: true` — its route
rejects tool-result follow-ups; a disabled entry documents it without offering
a broken model in `/models`. Everything else from the router was broken or
unverified at check time — see the comment block in the file.

### `default_agent`

```jsonc
"default_agent": "ctf"
```

Chooses the primary agent for sessions that have not selected one. It must
exist, be visible and support primary use. If it does not, OpenCode falls back
to `build`, then the first available primary agent. Changing this does not
retarget existing sessions.

### `agents` — maintenance overrides

```jsonc
"agents": {
  "compaction": { "model": "omnirouter/beam-free" },
  "title":      { "model": "omnirouter/beam-free" },
  "summary":    { "model": "omnirouter/beam-free" }
}
```

These are hidden built-ins that run on almost every turn: compaction writes
the summary when context fills, `title` names sessions, `summary` produces
auxiliary summaries. Pinning them to the cheapest verified model removes a
constant stream of frontier-model calls without touching answer quality.

Notes:
- `compaction` also honors `compaction.*` settings; `agents.compaction.model`
  is documented specifically for summaries.
- If a pinned model cannot be resolved, compaction falls back to the session
  model.
- V2 does not yet send per-agent request settings (`request.body`, e.g.
  temperature) — do not rely on them. Use model/provider settings instead.
- The file agents (`ctf`, `recon`, `hint`) live in `agents/*.md`; `crypto` is
  defined in `opencode.jsonc` under `agents.crypto`. The two forms merge, with
  config values overriding file scalars.

### `permissions` — the ordered rule list

```jsonc
"permissions": [
  { "action": "*", "resource": "*", "effect": "allow" },
  { "action": "shell", "resource": "sudo *", "effect": "deny" },
  ...
]
```

Semantics that matter:

- **Ordered; the last matching rule wins.** Broad rules go first, exceptions
  after them.
- **Effects:** `allow` (run silently), `ask` (prompt), `deny` (block).
- **No match = ask.** The base policy every agent starts with is
  `[{ "*","*","allow" }, { read:*.env, ask }, { read:*.env.*, ask },
  { read:*.env.example, allow }]`.
- **Resources use whole-value wildcards**: `*` matches any characters
  including `/`, `?` matches one. A shell pattern ending in ` *` also matches
  the bare command (`git status *` covers `git status`).
- **Shell is scanner-checked**: compound commands are split and each
  subcommand is checked; commands the scanner cannot parse safely are refused.
- **`external_directory`** defaults to allow; paths outside the project are
  checked against it before `read`/`edit` rules. We leave it permissive so
  challenges downloaded outside the project are still usable.
- **Agents append their own rules after these**, so an agent-level broad allow
  can undo a global deny. That is why agents here only deny actions.

Why this shape: a CTF needs dozens of shell calls per challenge (file,
strings, gdb, python, curl, nmap), so `ask` on everything would kill the flow.
The deny list targets catastrophic mistakes only (`sudo`, recursive forced
delete, disk formatting, reboot). Everything else is recoverable via Git or
`/undo`.

Live demo: replace the first rule with
`{ "action": "shell", "resource": "*", "effect": "ask" }` and let the room
watch approval prompts, then restore it.

### `policies` — the non-negotiable floor

```jsonc
"policies": [
  { "action": "tool.use", "resource": "read:*/.ssh/*", "effect": "deny" },
  { "action": "tool.use", "resource": "read:*/.aws/credentials", "effect": "deny" },
  { "action": "tool.use", "resource": "read:*/.config/gcloud/*", "effect": "deny" },
  { "action": "tool.use", "resource": "shell:sudo *", "effect": "deny" }
]
```

Policies differ from permissions:

- They **never prompt** and are **binary** (`allow`/`deny`).
- They can only **tighten**: a deny is final, even against an `ask` or a
  previously saved "Allow always".
- They apply **after** permissions and saved approvals.
- `tool.use` resources are `<action>:<value>`, matched against every resource
  the tool checks. Other actions: `provider.use`, `mcp.use`, `skill.use`,
  `plugin.use`, `websearch.use`, `integration.use`/`integration.connect`.

Why these rules: attendees run this on their own machines, and an agent that
reads an SSH key or cloud credential file would turn a challenge into a real
incident. The scope matters: `.ssh/*` protects the user's own keys without
blocking a challenge that legitimately ships a file named `id_rsa` (a common
forensics/crypto artifact). The `shell:sudo *` policy mirrors the permission
rule so even an "always allow" cannot escalate.

Caveat: policies match the command string, not intent. `shell:sudo *` catches
`sudo ...` but not an obfuscated equivalent; pair it with the approval UX in a
real engagement.

### `experimental.todo`

```jsonc
"experimental": { "todo": true }
```

Adds the `todowrite` tool. Multi-step CTF work (enumerate → hypothize →
exploit → verify) benefits from an explicit plan the user can see, and it stops
the agent from re-litigating finished steps. Costs one small tool schema.

### `experimental.background_compaction`

```jsonc
"background_compaction": true
```

Writes the compaction summary ahead of time, in the background, so a long
session does not pause when it hits the context threshold. Upstream marks it
experimental; it has fallbacks, and it is the first setting to disable if you
see odd behavior. The summary request reuses prompt cache; a summary that is
never used still costs tokens, which is acceptable for workshop sessions.

### `tool_output`

```jsonc
"tool_output": { "max_lines": 2000, "max_bytes": 65536 }
```

Caps how much of a tool result enters the model context. Full output is still
retained in a managed file that the agent can grep. 2000 lines / 64 KiB covers
nmap, gdb backtraces and decompiler output while keeping each turn cheap.
`read` has its own 2000-line / 50 KiB page limits; these settings govern tool
results generally.

### `compaction`

```jsonc
"compaction": {
  "auto": true,
  "keep": { "tokens": 24000 },
  "buffer": "20%"
}
```

- `auto`: compact automatically near the limit, and recover once when a
  provider rejects a request as too long.
- `keep.tokens`: recent conversation kept beside the summary. The default is
  15k; 24k keeps more exact commands and outputs, which matters when debugging
  an exploit.
- `buffer`: share of the model window kept free. `"20%"` starts compaction at
  80% full — earlier than the 15% default, so the largest prompts never get
  close to the hard limit.

Compaction is lossy. The summary covers objective, decisions, completed work,
blockers and next moves; the recent tail keeps the exact commands.

### `snapshots`

```jsonc
"snapshots": true
```

Captures filesystem state around each model step so `/undo` can restore files,
not just conversation. Requires a Git worktree. Best effort: it is a
convenience, not a backup — shell commands can change state Git cannot see.

### `websearch`

```jsonc
"websearch": false
```

Removes the web search tool entirely (schema included). This is a CTF choice:
no provider dependency, no spoilers from writeups, fewer tokens per request.
`webfetch` and `shell` curl are unaffected, so targeted OSINT still works.
Re-enable with `"websearch": { "provider": "random" }` plus a connected search
provider.

### `formatter`

```jsonc
"formatter": false
```

Explicitly off. Built-in formatters run after `write`/`edit`; on challenge
fixtures, payload files and exploit scripts that can change bytes and break the
solve. Formatting code is a convenience this kit does not want.

### `watcher`

```jsonc
"watcher": {
  "ignore": ["**/node_modules/**", "**/.venv/**", "**/__pycache__/**",
             "**/dist/**", "**/build/**", "**/target/**"]
}
```

Skips filesystem-update churn from dependency and build directories.
`work/` is deliberately not ignored: exploit scripts live there and the agent
should see those changes.

### `references`

```jsonc
"references": {
  "ctf-skills": {
    "path": "skills/vendor/ctf-skills",
    "description": "CTF playbooks, technique references and scripts for every category"
  }
}
```

Registers a named, read-only directory the agent can browse by alias instead of
guessing paths. Relative paths resolve from this config file's directory. The
entry appears in agent instructions with its description; the model lists the
root and reads specific files on demand. Add one per outside corpus (docs,
shared notes, another repo) if you need more.

### `mcp`

```jsonc
"mcp": {
  "servers": {
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "@playwright/mcp"],
      "disabled": true
    }
  }
}
```

Configured but disconnected. Playwright covers JS-rendered web challenges,
auth flows and browser-only bugs. Enabling is one edit:

```jsonc
"disabled": false
```

then `npx playwright install chromium` once. Tools appear as
`playwright_<tool>` and can be permissioned like any other action. Keep the
server disabled otherwise: MCP tool definitions cost context on every request.

### Still at defaults, on purpose

| Field | Why |
| ----- | --- |
| `plugins` | Nothing needs a plugin. Local plugins auto-load from `.opencode/plugins/` when you add one (see Tools). |
| `instructions` | `AGENTS.md` is auto-discovered; add `instructions` only for extra shared files or URLs. |
| `worktree` | Single-directory workshop flow; Git's default worktree location is fine. |
| `update` | Default (`notify`), so attendees decide when to upgrade mid-event. |
| `media` | Defaults already fit screenshots, stego images and PDFs used in forensics. |
| `skills` | Not needed: `.opencode/skills/` is auto-discovered, including from subdirectories. |
| `shell` | Uses the user's default shell; forcing zsh/bash breaks Windows and some attendees. |
| `experimental.subagent_depth` | Default `1`; the solver does not need subagents launching subagents. |

### Precedence and reload

- Applied order (lowest to highest): global `~/.config/opencode/opencode.jsonc`
  → ancestor project configs → nearest project config → `.opencode` configs →
  system config. Policies reverse this: broader scopes evaluate later and
  therefore win.
- Agent rules append after global permission rules; the last match wins.
- Config, agents, commands, skills and MCP servers hot-reload on save.
  `/reload` forces a full reload. No restart needed.
- Run `python3 .opencode/scripts/validate.py` after edits.

---

## Validate the kit

```sh
python3 .opencode/scripts/validate.py
# OK: checked 4 agents, 6 commands, 13 skills, 1 config
```

It checks agent/command frontmatter fields, `mode` values, colors, step
counts, permission shapes, broad allows that would override global denies,
model references against `providers.*.models`, command→agent links, subagent
targets, skill descriptions and `default_agent`. Non-zero exit on errors —
run it before the workshop and after any edit.

---

## Presenter notes

- Config reloads live: edit an agent, command, skill or the config during the
  demo and show it apply without a restart (`/reload` forces a full reload).
- `python3 .opencode/scripts/validate.py` is a good "we version our config"
  moment.
- Show the permission contrast: switch `shell *` to `ask`, then deny a tool.
- If the router is down, any OpenAI-compatible endpoint works — change
  `baseURL` and the models map, nothing else.
- Rotate the workshop API key after the event; it lives in the shell rc / user
  environment, never in the repo.
- Vendored skills are MIT, from
  [ljagiello/ctf-skills](https://github.com/ljagiello/ctf-skills); attribution
  and update instructions are in `skills/vendor/ctf-skills/VENDORED.md`.
