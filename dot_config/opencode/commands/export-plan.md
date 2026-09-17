---
description: Export the current architectural plan into a standalone, self-contained Markdown file
---

Export the plan, context, and architectural decisions from our active conversation into a single, comprehensive, fully self-contained Markdown specification file saved to disk.

CRITICAL REQUIREMENT - ZERO-CONTEXT THIRD-PARTY READABILITY:
The output document MUST be written as if the reader has ZERO prior knowledge of this repository, conversation, or background:
- An outside senior engineer, reviewer, or external LLM (like Claude or ChatGPT in a fresh tab) must be able to read this single document in isolation and completely understand WHAT is being built, WHY it is being built, WHERE the changes live, HOW to implement it, and WHAT risks exist.
- Never write vague phrases like "as discussed earlier" or "implement the helper method". Provide full context, exact paths, method names, and explicit code patterns or before/after pseudocode.

DOCUMENT STRUCTURE TO PRODUCE:
1. **Title & Metadata**: Clear title, date, target repositories/modules, and status.
2. **Context & Problem Statement**: The background, current state of the codebase, why the change is necessary, and business/technical motivations.
3. **Architecture & Design Decisions**: High-level approach, trade-offs considered, and reasons behind key decisions.
4. **Impacted Components & Dependencies**: List of all affected files, tables/schemas, endpoints, or services.
5. **Detailed Step-by-Step Implementation Plan**:
   - Organized chronologically (e.g., Phase 1: Migrations/Schema, Phase 2: Domain/Model, Phase 3: Service/Controller, Phase 4: API/Frontend).
   - Specific file paths, class/method names, and pseudocode or concrete examples.
6. **Edge Cases, Security & Failure Modes**: Concurrency issues, transaction rollbacks, authorization/permissions gates, validation traps.
7. **Verification & Testing Strategy**: Exact test cases, command lines (e.g., PHPUnit, migrations, CS checks) to verify success.
8. **Review Checklist for External Evaluators**: 3-5 specific questions or scrutiny angles for an outside reviewer to probe.

WORKFLOW:
1. Determine the destination file path. If the user provided a filename or path in their request, use it (ensuring it resides under `plans/`). Otherwise, default to saving inside `plans/<kebab-case-feature-name>.md`.
2. Ensure the parent directory exists, then write the Markdown file using the `write` tool.
3. Once the file is written, respond to the user with a concise summary of what was exported and the exact file path where it was saved.

$ARGUMENTS