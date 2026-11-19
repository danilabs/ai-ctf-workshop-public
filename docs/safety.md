# Safety and limits

[← Back to the README](../README.md)

## Safety and guardrails

- **Authorized targets only.** Challenge files, lab hosts and ports given to
  you. Real-world work only inside a written engagement.
- **Destructive commands are denied** by config, and the credential files that
  matter are policy-protected (see the permissions section in [tools-permissions-plugins.md](tools-permissions-plugins.md)). Attendees run this on their own
  machines, so a challenge must not become a real incident.
- **An allowlist, not just prose.** Remote hosts must be listed in
  `.opencode/targets.json`; `scope-guard` denies `shell`/`webfetch` for
  anything else. A target that states a policy about AI agents gets quoted to
  you and the run stops — that call is yours, not the model's.
- **The write guard** keeps artifacts in `work/`/`solution/` and `files/`
  read-only. Shell remains unrestricted by design; scope is a written rule.
- **Secrets stay out of the repo.** Rotate the router key after the event.
- **Offline by default.** The sample challenges need no network, and web search
  is disabled.

**Harness role — the boundary.** This section is what the harness refuses on
your behalf. It is short on purpose: a long list of promises would be a sign
that the checks live in prose instead of in the loop.


## What is intentionally not here

This is a workshop harness, not a competition platform. Four layers are
deliberately thin; knowing which they are matters as much as knowing what is
configured:

| Gap | Why it is out of scope | What it would take |
| --- | ---------------------- | ------------------ |
| Execution isolation | challenges run on the attendee host; pwn and malware work would need a boundary | `docker run --net none` or firejail, plus a rule that the harness, not the agent, chooses the runner |
| Scope enforcement for shell | `shell` is unrestricted by design, so "only this target" is a written rule | a per-challenge `targets.json` plus a shell pre-check that denies other hosts |
| Scoring loop | `solution/flag.txt` is written but never judged | a scorer that compares against reference flags and reports pass rate and token cost per challenge |
| Toolchain pinning | tools come from the attendee's own install | a versioned image with pwntools, gdb + gef, binwalk, exiftool, tshark, z3 |

If you add one, add its test at the same time — an offline test is the
difference between a demo and a harness.
