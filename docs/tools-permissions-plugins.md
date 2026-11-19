# Tools, permissions and plugins

[← Back to the README](../README.md)

## Tools and permissions

Permissions are an ordered list; **the last matching rule wins** and no match
means `ask`. The base rule allows everything so a solve is not interrupted by
approval prompts, then:

- **Denied outright:** `sudo`, `su`, `rm -rf` (and `-fr`, `-Rf`, `-r -f`),
  `mkfs*`, `dd if=* of=/dev/*`, `shutdown`, `reboot`, `chmod -R 777 *`.
- **Ask first:** reading `*.env`.
- **Policies** (binary, unforgeable, cannot be overridden by "Allow always"):
  any `read` of `*/.ssh/*`, `~/.aws/credentials`, `~/.config/gcloud/*` and
  `shell:sudo *`.

Agent-level rules are appended after the global ones, so an agent can only
tighten. The guard below covers file writes; shell scope is enforced by
`AGENTS.md` and by you.

**Harness role — policy.** Permissions are the veto: what the harness refuses
even when the model asks nicely. Policies are the part the model cannot
negotiate, not even with a saved "Allow always".


## Plugins

`.opencode/plugins/challenge-guard/index.ts` turns the folder convention into
enforcement. Started inside a folder, it denies `edit`/`write`/`patch`:

- outside the start folder (including `..` traversal and sibling prefixes),
- anywhere under `files/`, which is read-only input.

It normalizes absolute and relative permission paths before comparing, and it
only inspects `edit` actions — reads, shell and scans are untouched on purpose
(CTF tooling needs them). Verify it offline, no model needed:

```sh
node .opencode/scripts/test-challenge-guard.mjs
```

**Harness role — enforcement.** A rule in prose is advice; this plugin is a
check. It is also the smallest example of extending the harness in code rather
than in prompts, and it has an offline test so it can be trusted.
