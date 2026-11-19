# Troubleshooting and repository layout

[← Back to the README](../README.md)

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `Authentication required` / `ECONNREFUSED` | Key missing in that shell: `export OMNIROUTER_API_KEY="sk-..."` **before** starting OpenCode. |
| Guard denies a write | You are outside the start folder or writing into `files/`. Restart inside the challenge folder; copy inputs to `work/`. |
| Windows blocks the scripts | `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` |
| Free model slow or rate limited | `/models` → `longcat-2-5-free`, or a paid upgrade for hard chains. |
| Playwright tools missing | `.opencode/scripts/setup-playwright-mcp.sh`, then `/reload`. |
| Config change not applied | `/reload`, or `opencode service restart`. |


## Repo layout

```text
.opencode/              the kit: config, agents, commands, skills, plugins, scripts
AGENTS.md               workshop-wide rules loaded into every session
install.sh / .ps1       one-command setup for attendees
CTF/                    sample event: three solved challenges + author tool
README.md               this file
```

Inside `.opencode/`:

```text
opencode.jsonc          provider, models, agents, permissions, policies, tuning
agents/                 ctf, recon, hint (crypto is in opencode.jsonc)
commands/               solve, recon, hint, writeup, new-ctf
skills/                 ctf-methodology + vendored ctf-skills (MIT)
plugins/challenge-guard/ write guard for edit/write/patch
scripts/                scaffold, guard test, validator, Playwright setup
```
