# QUICKSTART.md — Ralph Loop Session Starter

## Paste this into EVERY new Claude Code session:

```
Read the following files in this exact order:
1. CLAUDE.md (project intelligence and rules)
2. PROGRESS.md (current build status)
3. VOLTIC_BUILD_PLAN.md (full phase specifications)

Tell me which phase is next based on PROGRESS.md.
Then execute ONLY that single phase from VOLTIC_BUILD_PLAN.md.

Follow the Ralph Loop protocol:
1. Implement all features listed in the phase
2. Run EVERY verification check listed at the bottom of the phase
3. If any check fails → fix it before moving on
4. Update PROGRESS.md:
   - Change the phase status to ✅ Complete
   - Add the current date
   - Write 1-2 sentences in the Notes column about what was built
   - Write context notes in "Context for Next Session" section for the next Claude Code session
5. Git commit with conventional commit message (e.g., feat: auth system with workspace creation)
6. STOP — do NOT proceed to the next phase. I will start a new session.

Begin.
```

## Why this works (Ralph Loop)

Each Claude Code session gets a fresh context window. By reading CLAUDE.md (stable project knowledge) and PROGRESS.md (dynamic state), every session starts with full context but zero accumulated rot. The build plan file provides the exact specification for the current phase only.

- Session 1: Reads files → executes Phase 1 → commits → stops
- Session 2: Reads files → sees Phase 1 ✅ → executes Phase 2 → commits → stops
- Session 20: Same quality as Session 1 because context never degraded

## First-time setup

Before your very first session, you need to bootstrap the project. Use this instead:

```
Read CLAUDE.md and VOLTIC_BUILD_PLAN.md.

Execute Phase 0: Project Bootstrap.
- Create the Next.js project with all dependencies listed in Phase 0
- Set up the project structure as defined in CLAUDE.md
- Create .env.local template
- Initialize git
- Update PROGRESS.md: Phase 0 → ✅ Complete

Then STOP.
```
