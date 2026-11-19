# Scripts

Build what you need here. Nothing is generated for you.

| Step | Suggested script | What it must do |
| ---- | ---------------- | --------------- |
| 6 | `test-guard.mjs` | offline deny/allow matrix for the guard plugin |
| 8 | `test-scope-guard.mjs` | deny an unlisted host, allow a listed one |
| 9 | `new-challenge.sh` | create `<EVENT>/<challenge>/{files,work,solution}`, record the flag format |
| 10 | `usage.py` | model, tokens, cost and time per challenge, with `--since` |
| 11 | `validate.py` | agent/command frontmatter, references, model pins |

An offline test is the difference between a demo and a harness: it must fail
when you remove a rule and pass when you restore it.
