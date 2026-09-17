# Architecture Blueprint: Local Context MCP Service ("DocDaemon")

## 1. Vision & Goals
* **Deterministic Grounding**: Zero cloud dependency, zero rate limits, zero privacy leaks. Exact token matching via lexical/BM25 search (with optional local vector embeddings) to ground LLMs in exact facts.
* **Token Efficiency**: Instead of dumping raw 10,000-line source files into LLM context, the server serves concise, focused doc chunks (just like Context7).
* **Format Normalization**: Ingests diverse doc formats (Markdown, MDX, and even PHP's DocBook XML) and standardizes them into clean, structured Markdown cards.
* **Sparse Sync**: Downloads *only* the documentation trees of large monorepos (e.g. Angular's `adev/src/content/`), avoiding gigabytes of compiler and build assets.

---

## 2. High-Level Architecture

```text
 ┌────────────────────────────────────────────────────────┐
 │ 1. INGESTION & SPARSE GIT SYNC                        │
 │    • git clone --filter=blob:none --sparse (Angular)   │
 │    • git pull on cron / systemd timer (daily)          │
 │    • cakephp/docs, TypeScript-Website, php/doc-en      │
 └──────────────────────────┬─────────────────────────────┘
                            │
 ┌──────────────────────────▼─────────────────────────────┐
 │ 2. PARSER & CHUNKING PIPELINE                          │
 │    • Markdown/MDX: AST heading chunker (H1/H2/H3)      │
 │    • DocBook XML (PHP): XML-to-Markdown card extractor │
 └──────────────────────────┬─────────────────────────────┘
                            │
 ┌──────────────────────────▼─────────────────────────────┐
 │ 3. STORAGE & DETERMINISTIC SEARCH                      │
 │    • SQLite FTS5 (BM25 exact keyword ranking)          │
 │    • (Optional) Local FastEmbed/ONNX embeddings        │
 └──────────────────────────┬─────────────────────────────┘
                            │
 ┌──────────────────────────▼─────────────────────────────┐
 │ 4. MCP INTERFACE (Model Context Protocol)              │
 │    • Tools: resolve_library_id, query_docs, get_page   │
 │    • Connected directly to OpenCode via opencode.jsonc │
 └────────────────────────────────────────────────────────┘
```

---

## 3. Core Technical Decisions

### A. Sparse Git Checkouts (The Secret to Large Repos)
Instead of cloning 1.5 GB of `angular/angular` or 1 GB of TypeScript:
```bash
# Clone ONLY git metadata without blobs, then sparse checkout only docs
git clone --depth 1 --filter=blob:none --sparse --branch 20.3.x https://github.com/angular/angular.git
cd angular
git sparse-checkout set adev/src/content
```
* **Result**: Downloads ~15 MB instead of 1.5 GB. You get the entire `angular.dev` documentation in clean Markdown with zero compiler bloat.

### B. The Parser Engine (Handling XML & Markdown)
1. **Markdown/MDX (`cakephp/docs`, `TypeScript-Website`, `angular/angular`)**:
   - Use `unified` / `remark` to parse the AST.
   - Chunk by section: Every `## Heading` becomes a discrete retrieval unit with its frontmatter, breadcrumbs (`Language > Generics > Type Guards`), and code examples.
2. **PHP DocBook XML (`php/doc-en`)**:
   - A 50-line Cheerio or `fast-xml-parser` script:
     - Extracts `<refname>` (e.g., `str_contains`)
     - Extracts `<methodsynopsis>` (signature)
     - Extracts `<refpurpose>` (description)
     - Extracts `<programlisting role="php">` (code examples)
   - Emits a clean Markdown snippet for each function:
     ```markdown
     # str_contains(string $haystack, string $needle): bool
     Determine if a string contains a given substring. Case-sensitive.
     ### Example:
     ```php
     str_contains('abc', 'a'); // true
     ```
     ```
   - *Advantage*: Transforms 80 MB of verbose XML into clean, ultra-dense markdown cards.

### C. Search & Retrieval Engine (Deterministic First)
Avoid heavy vector database infrastructure. Use **SQLite**:
* **SQLite with FTS5 (Full-Text Search)**:
  - Built into Python/Node standard runtimes.
  - Sub-millisecond queries using pure BM25 ranking.
  - Fully deterministic: The same query on the same corpus always returns the exact same ranked documents.
* **Hybrid Search (Optional future enhancement)**:
  - Add `sqlite-vec` or a lightweight local ONNX embedding model (like `bge-small-en-v1.5` running locally via CPU) to handle fuzzy or conceptual questions ("how do I catch unique constraint violations in CakePHP?").

### D. The MCP Tool Contract
Implement the exact interface LLMs already know how to use:
* `resolve_library_id({ query: string })`:
  Returns matching local libraries (e.g. `['angular/20', 'cakephp/5.x', 'typescript', 'php/8.5']`).
* `query_docs({ library_id: string, query: string })`:
  Returns the top 3–5 matching Markdown chunks with section titles and file paths.
* `get_full_page({ library_id: string, path: string })`:
  Fetches an entire document if the agent needs the full context.

---

## 4. Implementation Roadmap (When You Build It)

### Step 1: Storage & Ingestion (`~/.local/share/docdaemon/repos`)
Create a simple manifest file (e.g., `repos.json`):
```json
[
  {
    "id": "angular",
    "repo": "https://github.com/angular/angular",
    "branch": "20.3.x",
    "sparse_path": "adev/src/content"
  },
  {
    "id": "typescript",
    "repo": "https://github.com/microsoft/TypeScript-Website",
    "branch": "v2",
    "sparse_path": "packages/documentation/copy/en"
  },
  {
    "id": "cakephp",
    "repo": "https://github.com/cakephp/docs",
    "branch": "5.x",
    "sparse_path": "en"
  },
  {
    "id": "php",
    "repo": "https://github.com/php/doc-en",
    "branch": "master",
    "sparse_path": "reference"
  }
]
```
A short shell or Node script loops over this to run `git clone/pull` with sparse checkout.

### Step 2: The SQLite Indexer
* Create an SQLite database `~/.local/share/docdaemon/docs.db`.
* Table schema:
  ```sql
  CREATE VIRTUAL TABLE doc_chunks USING fts5(
    library_id UNINDEXED,
    path UNINDEXED,
    title,
    content,
    tokenize = 'porter unicode61'
  );
  ```

### Step 3: The MCP Server (`docdaemon-mcp`)
Can be written in TypeScript (`@modelcontextprotocol/sdk`) or Python (`fastmcp`):
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Database from "better-sqlite3";
import { z } from "zod";

const db = new Database(process.env.DOCS_DB_PATH);
const server = new McpServer({ name: "local-docs", version: "1.0.0" });

server.tool(
  "query-docs",
  { libraryId: z.string(), query: z.string() },
  async ({ libraryId, query }) => {
    const rows = db.prepare(`
      SELECT title, content, path, rank
      FROM doc_chunks
      WHERE library_id = ? AND doc_chunks MATCH ?
      ORDER BY rank
      LIMIT 5
    `).all(libraryId, query);

    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  }
);
```

### Step 4: OpenCode Connection
Wire it directly into your global `~/.config/opencode/opencode.jsonc`:
```jsonc
"mcp": {
  "servers": {
    "local_docs": {
      "type": "local",
      "command": ["node", "/home/cybervitor/.local/bin/docdaemon-mcp"]
    }
  }
}
```

---

## 5. Why This Will Be Superior to Remote Context7
1. **Zero External Latency**: Responses in <5ms locally from SQLite.
2. **Proprietary Knowledge**: You can add your CSTAF handbook (`handbook.wiki`) and Logseq documentation without leaking internal architectures to an external cloud index.
3. **Exact Grounding**: Deterministic keyword hits (like exact function names `str_contains`, `FormBuilder`, `Table::find`) take priority over hallucinated vector similarities.
4. **Offline Resilience**: Works seamlessly on planes, trains, or during network outages.
