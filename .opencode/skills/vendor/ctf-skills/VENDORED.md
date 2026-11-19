# Vendored: ljagiello/ctf-skills

The `ctf-*` and `solve-challenge` directories here are copied from
<https://github.com/ljagiello/ctf-skills> at commit `a16e19a`
(shallow clone, 2026-11-14).

- License: MIT — see `LICENSE` in this folder.
- Author: Lukasz Jagiello.
- Upstream README: `README.md`.

They are vendored so workshop attendees get the full skill catalogue without
network access or an install step. OpenCode auto-discovers them because they
live under `.opencode/skills/`; the skill IDs are the directory names
(`ctf-web`, `ctf-pwn`, …).

To update:

```sh
git clone --depth 1 https://github.com/ljagiello/ctf-skills /tmp/ctf-skills
cp -R /tmp/ctf-skills/ctf-* /tmp/ctf-skills/solve-challenge \
      /tmp/ctf-skills/scripts /tmp/ctf-skills/LICENSE /tmp/ctf-skills/README.md \
      .opencode/skills/vendor/ctf-skills/
rm -r /tmp/ctf-skills
```

Included skills: `ctf-web`, `ctf-pwn`, `ctf-crypto`, `ctf-reverse`,
`ctf-forensics`, `ctf-osint`, `ctf-malware`, `ctf-misc`, `ctf-ai-ml`,
`ctf-similar-search`, `ctf-writeup`, and the `solve-challenge` orchestrator.

Note: `ctf-similar-search` needs a `TAVILY_API_KEY` environment variable.
Optional toolchains can be installed with:

```sh
bash .opencode/skills/vendor/ctf-skills/scripts/install_ctf_tools.sh --dry-run all
bash .opencode/skills/vendor/ctf-skills/scripts/install_ctf_tools.sh all
```
