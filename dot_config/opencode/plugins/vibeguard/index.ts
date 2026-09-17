import { randomBytes } from "node:crypto"

// =============================================================================
// 1. Configuration & Security Limits
// =============================================================================

export interface VibeGuardConfig {
  /** Mode: 'gated' requires user permission to restore; 'redact-only' never restores */
  readonly mode: "gated" | "redact-only"
  /** Domains allowed to receive credentials if user approves (e.g. internal GitLab) */
  readonly allowedHosts: readonly string[]
  readonly maxSecretsPerSession: number
  readonly maxSecretBytesPerSession: number
  readonly maxActiveSessions: number
  readonly sessionTtlMs: number
}

export const DEFAULT_CONFIG: VibeGuardConfig = {
  mode: "gated",
  allowedHosts: ["localhost", "127.0.0.1", "git.cstaf"],
  maxSecretsPerSession: 50,
  maxSecretBytesPerSession: 64 * 1024, // 64 KB
  maxActiveSessions: 50,
  sessionTtlMs: 1000 * 60 * 60 * 4,    // 4 hours
}

// =============================================================================
// 2. Pattern Grammar (Aligned with Gitleaks / TruffleHog rulesets)
// =============================================================================

export interface SecretRule {
  readonly id: string
  readonly pattern: RegExp
}

export const SECRET_RULES: readonly SecretRule[] = [
  // 1. GitHub Tokens: Classic (ghp, gho, ghu, ghs, ghr) & Fine-grained (github_pat_)
  { id: "github-classic-pat", pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,255}\b/g },
  { id: "github-fine-grained-pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g },

  // 2. GitLab Personal Access Tokens
  { id: "gitlab-pat", pattern: /\bglpat-[0-9a-zA-Z_\-]{20,}\b/g },

  // 3. AI & Search Provider Credentials
  { id: "openai-api-key", pattern: /\bsk-(?:proj-|live-)?[a-zA-Z0-9_\-]{32,}\b/g },
  { id: "anthropic-api-key", pattern: /\bsk-ant-api[0-9]{2}-[a-zA-Z0-9_\-]{80,}\b/g },
  { id: "context7-api-key", pattern: /\bctx7sk-[0-9a-f\-]{36}\b/gi },
  { id: "firecrawl-api-key", pattern: /\bfc-[0-9a-f]{32}\b/gi },
  { id: "google-api-key", pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/g },

  // 4. Cloud & SaaS Infrastructure
  // Note: AWS Secret Access Keys have no static prefix and require semantic/entropy analysis.
  { id: "aws-access-key-id", pattern: /\b(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}\b/g },
  { id: "stripe-api-key", pattern: /\b(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}\b/g },
  { id: "slack-token", pattern: /\bxox[baprs]-[0-9a-zA-Z]{10,48}\b/g },
  { id: "npm-token", pattern: /\bnpm_[0-9a-zA-Z]{36}\b/g },

  // 5. Generic Tokens & Credentials
  { id: "bearer-token", pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi },
  { id: "json-web-token", pattern: /\beyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+\b/g },
  { id: "private-key-block", pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[^-]+-----END [A-Z ]+ PRIVATE KEY-----/gs },
  { id: "database-uri-credentials", pattern: /(?:postgres|postgresql|mysql|mariadb|mongodb|redis):\/\/[a-zA-Z0-9_\-\.]+:[^@\s"']+@[a-zA-Z0-9_\-\.]+(?::[0-9]+)?\/[^\s"']+/gi },
]

// =============================================================================
// 3. Isolated Session Vault
// =============================================================================

export class VaultQuotaExceededError extends Error {
  constructor(message: string) {
    super(`[VibeGuard] Vault quota exceeded: ${message}`)
    this.name = "VaultQuotaExceededError"
  }
}

export class SessionVault {
  readonly sessionID: string
  private readonly salt: string
  private tokenToSecret = new Map<string, string>()
  private secretToToken = new Map<string, string>()
  private totalBytes = 0
  lastAccessed: number

  constructor(sessionID: string) {
    this.sessionID = sessionID
    this.salt = randomBytes(4).toString("hex")
    this.lastAccessed = Date.now()
  }

  redact(text: string, config: VibeGuardConfig = DEFAULT_CONFIG): string {
    if (!text || typeof text !== "string") return text
    this.lastAccessed = Date.now()

    let sanitized = text
    for (const rule of SECRET_RULES) {
      sanitized = sanitized.replace(rule.pattern, (matchedSecret) => {
        if (matchedSecret.startsWith("OP_SEC_")) return matchedSecret

        let token = this.secretToToken.get(matchedSecret)
        if (!token) {
          if (this.tokenToSecret.size >= config.maxSecretsPerSession) {
            throw new VaultQuotaExceededError(`Max secrets (${config.maxSecretsPerSession}) reached for session ${this.sessionID}`)
          }
          if (this.totalBytes + matchedSecret.length > config.maxSecretBytesPerSession) {
            throw new VaultQuotaExceededError(`Max secret memory (${config.maxSecretBytesPerSession} bytes) reached for session ${this.sessionID}`)
          }

          const entropy = randomBytes(8).toString("hex")
          token = `OP_SEC_${this.salt}_${entropy}`
          this.tokenToSecret.set(token, matchedSecret)
          this.secretToToken.set(matchedSecret, token)
          this.totalBytes += matchedSecret.length
        }
        return token
      })
    }
    return sanitized
  }

  /**
   * Literal-safe token restoration using callback replacement to prevent $ interpretation.
   */
  restore(text: string): string {
    if (!text || typeof text !== "string" || this.tokenToSecret.size === 0) return text
    this.lastAccessed = Date.now()

    let restored = text
    for (const [token, secret] of this.tokenToSecret.entries()) {
      if (restored.includes(token)) {
        restored = restored.replaceAll(token, () => secret)
      }
    }
    return restored
  }

  containsTokens(text: string): boolean {
    if (!text || typeof text !== "string") return false
    for (const token of this.tokenToSecret.keys()) {
      if (text.includes(token)) return true
    }
    return false
  }

  size(): number {
    return this.tokenToSecret.size
  }
}

// =============================================================================
// 4. Bounded Session Vault Manager
// =============================================================================

export class VaultManager {
  private vaults = new Map<string, SessionVault>()

  constructor(private readonly config: VibeGuardConfig = DEFAULT_CONFIG) {}

  getOrCreate(sessionID: string): SessionVault {
    if (!sessionID || typeof sessionID !== "string") {
      throw new Error("[VibeGuard] Security Invariant Violation: Missing or invalid sessionID")
    }

    this.evictExpired()
    let vault = this.vaults.get(sessionID)
    if (!vault) {
      if (this.vaults.size >= this.config.maxActiveSessions) {
        const oldest = Array.from(this.vaults.entries()).sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)[0]
        if (oldest) this.vaults.delete(oldest[0])
      }
      vault = new SessionVault(sessionID)
      this.vaults.set(sessionID, vault)
    }
    return vault
  }

  get(sessionID: string): SessionVault | undefined {
    if (!sessionID) return undefined
    this.evictExpired()
    return this.vaults.get(sessionID)
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [id, vault] of this.vaults.entries()) {
      if (now - vault.lastAccessed > this.config.sessionTtlMs) {
        this.vaults.delete(id)
      }
    }
  }

  clear(): void {
    this.vaults.clear()
  }
}

// =============================================================================
// 5. Fail-Closed Traversal Engine
// =============================================================================

export function walkDeepFailClosed(
  target: unknown,
  transform: (val: string) => string,
  state = { depth: 0, nodeCount: 0 },
  limits = { maxDepth: 8, maxNodes: 500 },
  visited = new WeakSet<object>()
): unknown {
  state.nodeCount++

  if (typeof target === "string") {
    return transform(target)
  }

  if (target === null || typeof target !== "object") {
    return target
  }

  // Fail-Closed: If object structure is too deep, cyclic, or exceeds node budget,
  // do NOT leave raw data uninspected. Replace with sanitized truncation sentinel.
  if (state.depth >= limits.maxDepth || state.nodeCount >= limits.maxNodes) {
    return "[VIBEGUARD_PAYLOAD_TRUNCATED: Maximum scanning depth/node limit exceeded]"
  }

  if (visited.has(target)) {
    return "[VIBEGUARD_PAYLOAD_CYCLIC: Circular reference detected]"
  }
  visited.add(target)

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      target[i] = walkDeepFailClosed(target[i], transform, { ...state, depth: state.depth + 1 }, limits, visited)
    }
    return target
  }

  const obj = target as Record<string, unknown>
  for (const key of Object.keys(obj)) {
    obj[key] = walkDeepFailClosed(obj[key], transform, { ...state, depth: state.depth + 1 }, limits, visited)
  }
  return obj
}

// =============================================================================
// 6. Credential Release Policy Check
// =============================================================================

export function isAuthorizedDestination(input: unknown, allowedHosts: readonly string[]): boolean {
  const serialized = typeof input === "string" ? input : JSON.stringify(input)

  // Extract potential URLs from tool input
  const urlMatches = serialized.match(/https?:\/\/[^\s"'`<>]+/gi) ?? []
  if (urlMatches.length === 0) {
    // Non-URL command (e.g. local echo or file command)
    return true
  }

  for (const rawUrl of urlMatches) {
    try {
      const parsed = new URL(rawUrl)
      if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
        return false
      }
    } catch {
      return false // Malformed URL in command with secrets -> fail closed
    }
  }
  return true
}

// =============================================================================
// 7. Plugin Entry Point
// =============================================================================

export interface VibeGuardPlugin {
  readonly id: string
  readonly setup: (ctx: any) => Promise<(() => Promise<void>) | void> | void
}

export function definePlugin(plugin: VibeGuardPlugin): VibeGuardPlugin {
  return plugin
}

export default definePlugin({
  id: "vibeguard-privacy",
  async setup(ctx) {
    const config = DEFAULT_CONFIG
    const vaultManager = new VaultManager(config)

    // Await all hook registrations and collect disposers
    const registrations = await Promise.all([
      // 1. Prompt Hook: Ingress sanitization of developer prompt before inbox storage
      ctx.session.hook("prompt", (event) => {
        const sessionID = (event as { sessionID?: string }).sessionID
        if (!sessionID) {
          throw new Error("[VibeGuard] Prompt rejected: missing sessionID in security boundary")
        }
        const vault = vaultManager.getOrCreate(sessionID)
        if (event.prompt?.text) {
          event.prompt.text = vault.redact(event.prompt.text, config)
        }
      }),

      // 2. Outbound Context: Wire-only redaction of assembled messages before cloud LLM dispatch
      ctx.session.hook("context", (event) => {
        if (!event.sessionID) {
          throw new Error("[VibeGuard] Context rejected: missing sessionID in security boundary")
        }
        const vault = vaultManager.get(event.sessionID)
        if (!vault || vault.size() === 0) return

        if (Array.isArray(event.system)) {
          for (const sys of event.system) {
            if (sys && typeof sys.text === "string") {
              sys.text = vault.redact(sys.text, config)
            }
          }
        }

        if (Array.isArray(event.messages)) {
          for (const msg of event.messages) {
            walkDeepFailClosed(msg, (str) => vault.redact(str, config))
          }
        }
      }),

      // 3. Permission Escalation Gate: Intercept tool evaluation when placeholders are present
      ctx.permission.hook("evaluate", async (event) => {
        const vault = vaultManager.get(event.sessionID)
        if (!vault || vault.size() === 0) return

        // Check if any resource or tool argument contains an unredacted token
        const serialized = JSON.stringify({ resources: event.resources, metadata: event.metadata })
        if (vault.containsTokens(serialized)) {
          if (config.mode === "redact-only") {
            event.effect = "deny"
            event.message = "[VibeGuard] Credential release is forbidden under redact-only policy."
            return
          }

          // In gated mode, enforce human review
          event.effect = "ask"
          event.message = "[VibeGuard Security Gate] Agent is attempting to use a redacted credential. Confirm release."
        }
      }),

      // 4. Egress / Tool Execution Before: Gated credential injection
      ctx.tool.hook("execute.before", (event) => {
        const sessionID = (event as { sessionID?: string }).sessionID
        if (!sessionID) {
          throw new Error("[VibeGuard] Tool execution blocked: missing sessionID in security boundary")
        }

        const vault = vaultManager.get(sessionID)
        if (!vault || vault.size() === 0) return

        // In redact-only mode, never unmask tokens
        if (config.mode === "redact-only") return

        const serializedInput = typeof event.input === "string" ? event.input : JSON.stringify(event.input)
        if (!vault.containsTokens(serializedInput)) return

        // Confused-deputy firewall: Check destination host before allowing restoration
        if (!isAuthorizedDestination(event.input, config.allowedHosts)) {
          throw new Error(
            `[VibeGuard Firewall] Blocked attempt to send redacted credentials to an untrusted destination host.`
          )
        }

        // Restore token for approved local execution
        if (typeof event.input === "string") {
          event.input = vault.restore(event.input)
        } else if (typeof event.input === "object" && event.input !== null) {
          walkDeepFailClosed(event.input, (str) => vault.restore(str))
        }
      }),

      // 5. Ingress at Source: Sanitize tool outputs (stdout/stderr/errors)
      // Closes the leak before tool results reach conversation storage or title generation
      ctx.tool.hook("execute.after", (event) => {
        const sessionID = (event as { sessionID?: string }).sessionID
        if (!sessionID) return

        const vault = vaultManager.getOrCreate(sessionID)
        if (event.status === "completed" && event.result) {
          walkDeepFailClosed(event.result, (str) => vault.redact(str, config))
        } else if (event.status === "error" && event.error) {
          walkDeepFailClosed(event.error, (str) => vault.redact(str, config))
        }
      }),
    ])

    return async () => {
      await Promise.all(registrations.map((r) => r.dispose()))
      vaultManager.clear()
    }
  },
})
