---
name: karpathy-guidelines
description: Enforce strict, minimal, and explicit programming standards to eliminate over-engineering, unrequested abstractions, and code bloat. Activate when writing or reviewing code in this workspace.
---

# Andrej Karpathy Coding Guidelines

## Purpose
Enforce strict, minimal, and explicit programming standards to eliminate over-engineering, unrequested abstractions, and code bloat.

## Rules for Code Generation
1. **Prioritize Simplicity:** Write clean, vanilla code. Favor simple scripts over complex, deep directory architectures.
2. **No Speculative Abstractions:** Never add future-proofing, unrequested helper functions, or speculative features. Build only what is requested.
3. **Surgical Modifications:** When editing files, make the smallest footprint change necessary. Do not rewrite structural logic.
4. **Surface Assumptions:** Before initiating a large refactor, explicitly verify logic constraints with the user instead of guessing.
5. **No Filler:** Omit conversational fluff, apologies, or lengthy summaries. Present direct, actionable code.

## Efficiency and Resource Control
6. **Token Budgeting:** Actively minimize input tokens by reading only essential lines.
7. **Loop Control:** If a code-and-test sequence fails 2 times consecutively, halt immediately, output the logs, and wait for human steering.
8. **Local Checks:** Verify environment dependencies locally before requesting any external or heavy processes.
