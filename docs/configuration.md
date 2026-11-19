# Configuration and scripts

[← Back to the README](../README.md)

## Scripts

| Script | Purpose |
| ------ | ------- |
| `new-challenge.sh` | scaffold an event/challenge (Linux/macOS) |
| `new-challenge.ps1` | same, for Windows PowerShell |
| `validate.py` | checks agents, commands, skills and model references |
| `test-challenge-guard.mjs` | offline deny/allow matrix for the guard |
| `setup-playwright-mcp.sh` | install/enable the browser MCP |

`install.sh` / `install.ps1` copy `.opencode/`, `AGENTS.md` and the `CTF/`
sample event into the target folder, so a fresh install is immediately usable.

**Harness role — tooling and tests.** These are the parts of the harness that
touch the filesystem directly, so they are also the parts that must be
testable without a model: `validate.py` and the guard test both run offline.


## Configuration

`.opencode/opencode.jsonc` is project config; OpenCode applies it after global
config and hot-reloads it. It declares the provider and curated models, the
default agent, permissions and policies, compaction and tool-output limits,
`references.ctf-skills`, and the disabled Playwright server. The full
line-by-line guide — what each field does, how to add a provider, model, agent,
command, skill, tool or MCP server, and the precedence rules — is
[`.opencode/README.md`](../.opencode/README.md).

After any edit:

```sh
python3 .opencode/scripts/validate.py
node .opencode/scripts/test-challenge-guard.mjs
```

**Harness role — assembly.** Every layer of the [harness model](harness.md) is merged here, and precedence
decides what actually runs: global config, project config, agent rules,
policies. A change that seems not to apply is almost always a precedence
question, not a bug.
