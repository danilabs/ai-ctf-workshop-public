# Sessions, context, cost and usage

[← Back to the README](../README.md)

## Sessions and context

Tuned for long solves at low cost: tool results are capped (2000 lines /
64 KiB, full output stays on disk), automatic compaction keeps 24k recent
tokens and starts at 80% of the window, and `snapshots` lets `/undo` restore
files (needs a Git worktree). Web search is off — no spoilers from writeups, no
provider dependency — while `webfetch` and `curl` remain for targeted OSINT.
The formatter is off so it cannot rewrite payload bytes. Playwright MCP is
pre-installed but disabled until a web challenge needs a browser.

**Harness role — state.** Context is the scarce resource: compaction decides
what survives, the caps decide what enters, and `work/notes.md` is the part you
control. A harness without this layer works only on short challenges.


## Cost and usage

Two numbers matter and they are not the same: what OpenCode **recorded** and
what the model actually **costs**.

- **Recorded.** Every assistant message stores its model and token counts in
  OpenCode's local database. A cost is recorded only for models with pricing
  configured — the curated entries here have none, so recorded cost is $0.
- **Estimated.** `.opencode/pricing.json` holds USD per 1M tokens per
  `provider/model`; the reporter applies it, billing reasoning at the output
  rate. Empty prices mean "not configured", never a guessed number.

The `ctf` agent ends every solve with a usage line, and `/cost` asks for it on
demand:

```sh
python3 .opencode/scripts/usage.py                  # sessions started in this folder
python3 .opencode/scripts/usage.py --all            # whole repository
python3 .opencode/scripts/usage.py --since 1794754899   # exactly one solve
python3 .opencode/scripts/usage.py --json           # machine-readable
```

The reporter also prints how long the solve took, first message to last:
`time: 12m 34s (16:02:10Z -> 16:14:44Z)`. The agent records `date +%s` at the
start of the solve and passes it as `--since`, so the window is exact rather
than "the whole session".

```text
usage: opencode-go/deepseek-v4.1-flash · 37 steps · in 44,529 / out 13,408 / cache-read 12,984,832 · cost $0.00 (pricing not configured) · solved in 12m 34s
```

Attribution is by the directory OpenCode was started in — one challenge, one
session, clean numbers. Full details in `.opencode/README.md`.
