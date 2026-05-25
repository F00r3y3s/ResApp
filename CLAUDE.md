# Family AI Kitchen

Follow `AGENTS.md`, `docs/product/prd-v1.md`, and the App Store release gates before implementing feature slices.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## Matt Pocock skills (project install)

Skills are copied into `.claude/skills/`. Slash commands like `/diagnose`, `/tdd`, `/grill-me`, `/grill-with-docs`, `/zoom-out`, `/to-prd`, `/to-issues`, `/triage`, `/improve-codebase-architecture`, `/prototype`, `/handoff`, `/caveman`, `/write-a-skill`, and `/setup-matt-pocock-skills` are available.

**First-time setup per repo:** Run `/setup-matt-pocock-skills` once to scaffold the issue tracker, triage labels, and shared `CONTEXT.md`. Other engineering skills depend on it.

**Daily-use favorites:**
- `/grill-with-docs` — alignment grilling with shared-language updates to `CONTEXT.md` + ADRs
- `/tdd` — red-green-refactor loop on a vertical slice
- `/diagnose` — disciplined bug/perf debugging loop
- `/zoom-out` — broader system context for unfamiliar code

Update with `npx skills@latest update`. Source: <https://github.com/mattpocock/skills>.
