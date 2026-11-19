# Events and challenges

[← Back to the README](../README.md)

## Starting a new CTF event

Every event is just a top-level folder — any name, any flag format. One folder
per challenge:

```text
<EVENT>/
├── README.md              event rules, flag format, description
└── <challenge>/
    ├── README.md          statement, category, points, connection
    ├── files/             original files (read-only)
    ├── work/              scripts, dumps, notes (agent output)
    └── solution/          writeup.md + flag.txt
```

`CTF/` is a filled-in example of exactly this layout.

### Option A — one command

Example: an event `ctf-ai` whose flags look like `flagai{...}`. Run from the
kit root:

```sh
.opencode/scripts/new-challenge.sh ctf-ai web-01 web --flag 'flagai{}'
pwsh .opencode/scripts/new-challenge.ps1 ctf-ai web-01 web -Flag 'flagai{}'  # Windows
```

- `--flag` accepts `flagai{}`, `flagai{...}` or the bare prefix `flagai`;
  without it the format is `<EVENT>{...}`.
- The format is recorded in `ctf-ai/README.md` and **inherited** by later
  challenges of that event:

  ```sh
  .opencode/scripts/new-challenge.sh ctf-ai crypto-01 crypto
  ```

- No first challenge yet: `new-challenge.sh ctf-ai --event-only --flag 'flagai{}'`.
- Existing READMEs are kept unless you pass `--force`/`-Force`. `--help` lists
  everything.

The whole challenge brief can come from the terminal, so the README is usable
the moment the folder exists:

```sh
.opencode/scripts/new-challenge.sh NLP2026-Test crypto-01 crypto \
  --title 'Baby RSA' \
  --description 'Small e, and the same message went to three people.' \
  --connection 'nc 10.0.0.5 1337' \
  --points 100 --author anon
```

```powershell
pwsh .opencode/scripts/new-challenge.ps1 NLP2026-Test crypto-01 crypto `
  -Title 'Baby RSA' -Description 'Small e, same message, three people.' `
  -Connection 'nc 10.0.0.5 1337' -Points 100 -Author anon
```

- `--title` sets the H1 (default: the folder name).
- `--description` is the statement; quote it. A quoted multi-line string and
  `'$'`, backticks or apostrophes are kept verbatim.
- `--connection`/`--target` takes `none`, `nc host port` or a URL.
- `--points` and `--author` fill the remaining header fields.
- Anything you leave out stays `[TO FILL]`, and re-running the same command
  replaces only those marker lines — your prose is never rewritten.

### Option B — let the agent ask

Start OpenCode **at the kit root** and run `/new-ctf`. It asks for the event
schema in two short rounds (name, flag format, dates, format, teams, platform,
then policies, scoring and optionally a first challenge), validates the
answers, runs the same scaffold and fills only the `[TO FILL]` lines it was
given. Skipped answers stay `[TO FILL]` — the agent does not invent dates,
rules or points.

Run it at the kit root: the write guard only permits writes under the folder
OpenCode was started in, so event creation from inside a challenge is denied by
design.

### After scaffolding

1. Put the material in `<EVENT>/<challenge>/files/` and treat it as read-only;
   work on **copies** in `work/`.
2. Paste the statement into the challenge README, fill points/author/connection.
3. Fill the event README once (dates, format, teams, platform, policies,
   scoring).
4. `export OMNIROUTER_API_KEY="sk-..."`, then `cd <EVENT>/<challenge> && opencode`.

**Harness role — context.** The event README is how the model learns the domain
and the valid flag format; the challenge README is the brief; `AGENTS.md` adds
the workspace contract that applies to every turn.


## The sample CTF

`CTF/` is a complete, solved event: the fastest way to see what correct output
looks like. Its README explains the folder-to-feature mapping; the challenges
are small, offline and drift-free.

| Challenge | Category | Skill it exercises | Flag |
| --------- | -------- | ------------------ | ---- |
| `CTF/xor-01` | crypto | `ctf-crypto` | `CTF{x0r_1s_n0t_crypt0}` |
| `CTF/png-01` | forensics | `ctf-forensics` | `CTF{png_chunks_tell_tales}` |
| `CTF/enc-01` | misc | `ctf-misc` | `CTF{lay3rs_4r3_fun}` |

Each challenge ships a reference `work/solve.py` and a finished `solution/`, so
a learner can diff their path against a working one. Challenge files are
rebuilt by an instructor tool that also records the intended flags:

```sh
python3 CTF/tools/generate.py
```

Suggested tour: `/recon` the file, `/solve` it, then try writing into `files/`
or outside the folder and watch the guard deny it.

**Harness role — fixtures.** Known-answer challenges are the only way to tell
whether the harness works: without them you are debugging the model and the
harness at the same time. They are also the regression set for prompt edits.


## Solving a challenge

The agent follows the workshop loop, visibly:

1. **Recon** — `file`, `strings`, `binwalk`, `exiftool`, banners, `curl -i`.
2. **Classify** — category plus the most likely vulnerability classes.
3. **Plan** — cheapest hypothesis first, one change per step.
4. **Exploit** — script it when it involves crypto, formats or repetition.
5. **Capture** — extract the flag, validate it against the event format, save
   it to `solution/flag.txt`.

Rules the agent follows:

- **Scope.** Only the files or host/port you name; nothing else is touched.
- **One challenge, one session**, so context stays focused.
- **Artifacts in `work/`**, results in `solution/`; `files/` is read-only.
- **Flags are verified, not guessed.** The event README is the format source.
- **Notes as it goes** (`work/notes.md`), which keeps the writeup cheap.

**Harness role — policy.** The five phases are guidance for the model; the
bullets under them are what the harness can actually enforce. Keeping the two
separate is the point: a rule the harness cannot check is advice, not a
control.
