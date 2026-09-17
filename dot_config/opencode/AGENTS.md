# OpenCode Configuration Context

This repository (`~/.config/opencode`) houses the global configuration and custom skills for OpenCode, tailored primarily for the CSTAF project context.

## Key Files & Structure
- `opencode.jsonc`: The main configuration file. It uses JSONC format, meaning comments are supported and heavily used. **Do not strip or remove existing comments** when making modifications.
- `skills/`: Directory for custom OpenCode skills. Each skill must be a Markdown (`.md`) file starting with a YAML frontmatter block containing exactly `name` and `description` keys.
- **Note:** `package.json` and `node_modules` are locally generated/ignored. Do not rely on them as version-controlled sources of truth.

## Configuration Quirks & Conventions
- **Tone & Style Rule — ABSOLUTELY NO EMOJIS**: NEVER use emojis anywhere across any repository, wiki, code, documentation, comments, commit messages, PRs, or responses. Emojis look artificial, childish, and "AI-coded". Maintain a clean, professional, human engineering tone at all times.
- **Permissions Evaluation**: Inside `opencode.jsonc` under `permissions`, rules are an ordered array of `{ action, resource, effect }` objects evaluated such that **the LAST matching rule wins**. Always place broad wildcards (e.g., `{ "action": "shell", "resource": "*", "effect": "allow" }`) first, followed by specific overrides or restrictions.
- **Environment Variables**: Never hardcode API keys (like Context7 or Firecrawl) in `opencode.jsonc`. Use the `{env:VAR_NAME}` placeholder syntax (e.g., `{env:CONTEXT7_API_KEY}`).
- **MCP Server Invocations**: The configuration heavily relies on local MCP servers under `mcp.servers`. When adding an `npx`-based MCP server, prefer using `["npx", "-y", "package-name"]` in the `command` array. When adding Python `uv`-based servers, use `["uvx", "--with", "mcp<1.6", "package-name"]` to avoid breaking changes in newer MCP SDKs.

## Modifying Agents
- Global context instructions for agents are under the `instructions` array.
- Agent-specific overrides (model, request body settings, system prompt, tool constraints) are located under the `agents` object in `opencode.jsonc` or as Markdown definitions under `agents/<name>.md`.
- Keep in mind that global agent settings apply across all workspace projects (CSTAF enterprise systems, ISEG academic coursework, and personal projects).

## Workspace Ecosystem & Taxonomy
The user workspace is divided into three distinct spheres:

1. **CSTAF (Conselho Superior dos Tribunais Administrativos e Fiscais)**:
   - Primary professional workspace located at `~/Projects/CSTAF`.
   - **SIGTAF**: Case management application suite (`sigtaf-frontend`, `sigtaf-backend`, `estatisticas`, `movimento-2025`).
   - **bdSTA**: Independent legal database and jurisprudence crawler suite (`bdsta-backend`, `bdsta-frontend`, `bdsta-crawler`). Completely separate from SIGTAF.
   - **DevOps**: Shared cross-cutting container definitions, base images, and deployment manifests (`devops/images`, `devops/deploy`).
   - **Global Standards & Documentation**:
     - `handbook.wiki`: Technical guidelines, Trunk-Based Development rules, and engineering standards for ALL CSTAF projects.
     - `Software Team Documentation` (Logseq): Domain specifications, analysis, and ADRs spanning all CSTAF systems.
2. **ISEG**:
   - Coursework and data science modules located at `~/Projects/ISEG`.
   - Sponsored by CSTAF, but independent from internal court systems.
   - Subdirectories represent individual academic courses (`NLPG`, `TSF`, `MALE`, `AIM`, `AIDMD`, `PI`).
3. **Personal**:
   - Side projects, developer tooling, hardware/3D printing, and language experimentation located at `~/Projects/Personal` (`fast-git`, `odin-raylib-pong`, `android-monitor`, `NAS`, `Ender3`, `typescript-classes`).
   - Free from enterprise/CSTAF constraints.

## Progressive Context Architecture
In complex repositories (such as `sigtaf-backend`, `sigtaf-frontend`, and `bdsta-*`), context is organized hierarchically:
- **Root `AGENTS.md`**: Kept concise (< 80 lines). Contains non-negotiable hard invariants (execution context, container commands, security gates) and an Index Table.
- **`.agents/*.md` Runbooks**: Detailed domain guides (`architecture.md`, `testing.md`, `data-model.md`, `api-contract.md`, etc.).
- **Rule for Agents**: Do not expect all repository rules to be in the root file. When executing work in a domain area, read the corresponding `.agents/<topic>.md` runbook on demand.

## Development Workflow
- Since `opencode.jsonc` is a configuration file rather than executable code, there are no build steps. If you are unsure about syntax validity, rely on standard JSONC validation before concluding your edits.
