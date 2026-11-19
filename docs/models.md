# Models

[← Back to the README](../README.md)

## Models

The kit talks to an OpenAI-compatible router (OmniRouter, host
`ai-router.42security.io`); the credential is `OMNIROUTER_API_KEY` from the
environment. Provider ID in the config: `omnirouter`.

| Key | Notes |
| --- | ----- |
| `beam-free` | **default**, free tier, 200k context, tools + reasoning |
| `longcat-2-5-free` | free fallback when Beam is rate limited |
| `glm-5-3` | free tier (workshop set), reasoning, 1M context |
| `deepseek-v4-1-flash` | free tier (workshop set), long analyses, 1M |
| `haiku-5-5` | optional paid, fast, 1M context |
| `kimi-k2-7-code` | optional paid, exploit scripting, 262k |
| `qwen3-8-flash` | optional paid, open model, 1M |
| `gpt-6-luna` | disabled: route breaks on tool-result follow-ups |

Default, both subagents and the maintenance calls (compaction, titles,
summaries) are pinned to the free tier, so a session costs nothing until you
choose a paid model with `/models`. Switch per session, per agent
(`agents.<id>.model`) or per run (`--model omnirouter/<key>`).

**Harness role — model access and cost.** Model choice is a harness decision,
not a user preference: pins on subagents and maintenance calls are what keep a
two-hour workshop at zero cost until someone opts into a paid route.
