---
description: Audit workspace context drift, verify hub table synchronization, and check progressive context integrity
---

Run a complete context and knowledge drift audit across the workspace:

1. Execute the diagnostic tool:
   Run `/home/cybervitor/.config/opencode/bin/audit-drift --json` via shell.
2. Analyze the findings:
   - Hub Table Integrity: Check if any new subdirectories were created in CSTAF, ISEG, or Personal that are not indexed in their respective `AGENTS.md` tables, or if any table entries point to non-existent paths.
   - Progressive Context Integrity: Check if all `.agents/*.md` runbooks referenced by local `AGENTS.md` files exist on disk.
   - Coverage Gaps: Check if any active projects or submodules lack an `AGENTS.md`.
3. Present an executive summary to the user:
   - Clearly report any broken references or unindexed subdirectories.
   - List the directories currently lacking local documentation.
4. If drift is detected (unindexed directories or broken references), propose the exact edits needed to reconcile the hub tables and ask the user if they want to apply them.
