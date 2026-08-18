# OpenCode Configuration Context

This repository (`~/.config/opencode`) houses the global configuration and custom skills for OpenCode, tailored primarily for the CSTAF project context.

## Key Files & Structure
- `opencode.jsonc`: The main configuration file. It uses JSONC format, meaning comments are supported and heavily used. **Do not strip or remove existing comments** when making modifications.
- `skills/`: Directory for custom OpenCode skills. Each skill must be a Markdown (`.md`) file starting with a YAML frontmatter block containing exactly `name` and `description` keys.
- **Note:** `package.json` and `node_modules` are locally generated/ignored. Do not rely on them as version-controlled sources of truth.

## Configuration Quirks & Conventions
- **Permissions Evaluation**: Inside `opencode.jsonc` under `permission.bash` (and similar blocks), glob patterns are evaluated such that **the LAST matching rule wins**. Always place wildcards (e.g., `"*": "allow"`) at the top of the object, followed by specific overrides or restrictions.
- **Environment Variables**: Never hardcode API keys (like Context7 or Firecrawl) in `opencode.jsonc`. Use the `{env:VAR_NAME}` placeholder syntax (e.g., `{env:CONTEXT7_API_KEY}`).
- **MCP Server Invocations**: The configuration heavily relies on local MCP servers. When adding an `npx`-based MCP server, prefer using `["npx", "-y", "package-name"]` in the `command` array. When adding Python `uv`-based servers, use `["uvx", "--with", "mcp<1.6", "package-name"]` to avoid breaking changes in newer MCP SDKs.

## Modifying Agents
- Global context instructions for agents are under the `instructions` array.
- Agent-specific overrides (model, temperature, system prompt, tool constraints) are located under the `agent` object.
- When creating or refining agent prompts, remember they apply globally to the user's workspace (typically the CSTAF monorepo — CakePHP backend, Angular frontend).

## Development Workflow
- Since `opencode.jsonc` is a configuration file rather than executable code, there are no build steps. If you are unsure about syntax validity, rely on standard JSONC validation before concluding your edits.
