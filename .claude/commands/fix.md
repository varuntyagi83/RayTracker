# /fix — Parallel Bug Fix Runner

Automatically group and fix open issues using parallel agents. Works with output from `/qa` or any list of issues.

## Usage
- `/fix` — fix all open issues from the most recent QA report (reads BUGS_ISSUES.md)
- `/fix C-NEW-1 H-NEW-2` — fix specific issue IDs
- `/fix critical` — fix only CRITICAL severity issues
- `/fix high` — fix CRITICAL + HIGH issues
- `/fix all` — fix everything open (all severities)

## Your Process

**Scope:** `$ARGUMENTS`

**Step 1 — Load issues**
- If no argument: read `voltic/BUGS_ISSUES.md` and extract all issues with status ≠ ✅ Fixed
- If argument is severity keyword (critical/high/all): filter by severity
- If argument is issue IDs: load only those issues
- If BUGS_ISSUES.md doesn't exist or is stale: ask the user to run `/qa` first

**Step 2 — Group into parallel batches**

Group issues by the files they touch to avoid edit conflicts:

| Group | Issues to include |
|-------|------------------|
| **ai-layer** | Any issue in `src/lib/ai/`, `src/lib/data/variations.ts` |
| **api-routes** | Any issue in `src/app/api/`, `src/lib/mcp/` |
| **data-layer** | Any issue in `src/lib/data/` (excluding variations.ts) |
| **migrations** | Any issue in `supabase/migrations/`, `src/db/schema.ts` |
| **ui** | Any issue in `src/app/(dashboard)/`, `src/components/` |
| **infra** | Any issue in `src/lib/utils/`, `src/lib/slack/`, `src/lib/supabase/` |

**Step 3 — Announce the plan**

Before launching agents, output:
```
Fixing N issues across K groups (parallel):
  Group 1 [ai-layer]: issue IDs → files
  Group 2 [migrations]: issue IDs → files
  ...
```

**Step 4 — Launch one agent per group in parallel**

For each group, launch an Agent with subagent_type=general-purpose with these instructions:

> You are fixing specific bugs in the Voltic codebase.
> Working directory: /Users/varuntyagi/Downloads/Claude Research/RayTracker/voltic
>
> Issues to fix: [list with descriptions and evidence from QA report]
>
> Rules:
> 1. Read every file before editing it
> 2. Make the minimal change that fixes the issue — don't refactor surrounding code
> 3. For each fix, note the line(s) changed
> 4. If a fix would require changes across groups (e.g., schema change + data layer), flag it and make only the changes in your assigned files
> 5. After all fixes, run: cd /path/to/voltic && npx tsc --noEmit to verify no TypeScript errors

**Step 5 — Report results**

After all agents complete, output a summary table:

```
FIX RESULTS
─────────────────────────────────────────────────────
Issue   | Status  | Files Changed
────────|─────────|──────────────────────────────────
C-NEW-1 | ✅ Fixed | src/lib/ai/competitor-report.ts
H-NEW-1 | ✅ Fixed | src/lib/ai/decompose.ts
M-NEW-3 | ✅ Fixed | src/app/api/mcp/route.ts
C-NEW-2 | ⚠️ Partial | Created migration file, schema.ts update needed
─────────────────────────────────────────────────────
Commit ready: git commit -m "fix: [Round N] resolve [N] QA issues"
```

**Step 6 — Update BUGS_ISSUES.md**
Mark each fixed issue as ✅ Fixed with today's date. Add new issues discovered during fixing if any.

## Rules
1. Never launch more than 6 agents in parallel (context limit)
2. Never put two agents on the same file — check group assignment carefully
3. If an issue requires coordination between groups, fix the dependency group first
4. TypeScript errors = fix not complete. Do not mark as done until tsc passes.
5. Never auto-commit — present the results and let the user commit
