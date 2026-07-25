# AarogyaQ Workspace Rules

## PROGRESS.md Auto-Update Rule

**MANDATORY:** After completing ANY task or group of tasks in this workspace (AarogyaQ), you MUST update the file `c:\Users\aayus\OneDrive\Desktop\AarogyaQ\PROGRESS.md` before ending your turn. This rule applies in all of the following situations:

1. **After implementing any feature** tracked in REVISED.md (R-XAI-*, R-DYN-*, R-RL-*, R-SED-*)
2. **After any bulk work session** where multiple changes are made
3. **Proactively on a 2-day frequency** — if no tasks were done, still check if the date has rolled 2+ days past the "Last Updated" line and touch the date at minimum

### How to Update PROGRESS.md

When updating `PROGRESS.md`:
1. Update the "Last Updated" date at the top.
2. For each completed change ID (e.g., `R-RL-01`), change `⬜ Pending` → `✅ Done` in the Change Tracking table, and fill in the completion date.
3. Move the corresponding `[ ]` checklist item in each pillar section to `[x]`.
4. Recalculate the overall percentage: count completed change IDs out of 18 total, weighted by pillar, and update the overall `███` progress bar.
5. Adjust each pillar's individual progress bar proportionally.
6. Commit with: `chore(root): update PROGRESS.md -- [brief summary of what was completed]`

### Progress Bar Format

Use Unicode block characters for progress bars, 40 chars wide:
- Full block: `█`
- Empty: `░`
- Formula: `filled = round(percentage / 100 * 40)`, rest are empty blocks.

Example for 75%: `██████████████████████████████░░░░░░░░░░  75%`

### Current Baseline (2026-07-25)

| Pillar | Completion | Pending Changes |
|--------|-----------|-----------------|
| Backend Core | 100% | — |
| Clinical Rules Engine | 85% | R-XAI-02, R-XAI-05 |
| Reinforcement Learning | 60% | R-RL-01, R-RL-02, R-RL-04, R-RL-05 |
| Digital Twin / Dynamic | 50% | R-DYN-01, R-DYN-02, R-DYN-03, R-DYN-04 |
| Frontend | 80% | R-XAI-01, R-XAI-03, R-SED-03, R-SED-04 |
| XAI End-to-End | 40% | R-XAI-01 through R-XAI-05 |
| Smart ED | 70% | R-SED-01, R-SED-02 |
| **Overall** | **55%** | **18 pending** |
