---
name: cstaf-changelog
description: Use when the user asks to generate release notes, write a changelog, or document version changes for a new SIGTAF release aimed at non-technical end-users (judges and office clerks).
---

# CSTAF User-Friendly Release Notes & Changelog Skill

This skill guides the creation and maintenance of **end-user release notes (changelogs)** for SIGTAF. 
The generated changelogs are specifically written for **non-technical stakeholders** (Juízes, Magistrados, Oficiais de Justiça e Funcionários de Secretaria) and are persistently tracked in the CSTAF Handbook Wiki.

---

## 1. Audience & Communication Guidelines

- **Target Audience**: Juízes, Oficiais de Justiça e Funcionários Judiciais.
- **Tone & Style**: Formal, clear, polite, and objective in European Portuguese (`pt-PT`).
- **Strictly No Developer Jargon**:
  - ❌ **Do NOT mention**: endpoints (`GET /entries`), HTTP codes (`500`, `401`), database migrations, SQL, Docker, CI/CD, pipelines, Git commands, token expiration, N+1 queries, Jest, PHPUnit.
  - ✅ **DO explain in terms of user experience and business value**:
    - *Example (Raw commit)*: `Raised token expiration time from 4 to 8 hours`
    - *User-friendly*: "Aumentada a duração da sessão de trabalho ativa para 8 horas, reduzindo a necessidade de reautenticação ao longo do dia."
    - *Example (Raw commit)*: `hotfix-double-toast-login-error`
    - *User-friendly*: "Corrigida a apresentação duplicada de alertas em caso de erro no ecrã de autenticação."
    - *Example (Raw commit)*: `hotfix-parish-validations`
    - *User-friendly*: "Ajustadas as validações de seleção de freguesia no preenchimento de endereços."

---

## 2. Versioning Strategy Alignment

Always align the versioning interpretation with `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/git/versionamento_releases.md`:

- **PATCH (`0.x.X` / `1.x.X`)**: Regular production deployment containing bug fixes, stability improvements, and usability refinements.
- **MINOR (`0.X.0` / `1.X.0`)**: Official launch of a **New Module** (e.g., Módulo de Declarações de Rendimentos, Módulo de Gestão Documental).
- **MAJOR (`1.0.0`)**: Final conclusion and full delivery of the initial SIGTAF roadmap.

---

## 3. Step-by-Step Generation Workflow

### Step 1: Check & Initialize Wiki Changelog Tracker
1. Check `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/changelog/changelog.md`.
2. If the directory or file does not exist, create it with the following structure:
   ```markdown
   # Notas de Lançamento (Changelog) - SIGTAF

   [<- Home](../home)

   Este documento regista o histórico de atualizações e melhorias introduzidas em cada versão do SIGTAF, apresentadas de forma clara para juízes, magistrados e funcionários judiciais.

   ---
   ```
3. Read `changelog.md` to identify the **last documented version**.

### Step 2: Discover Remote Tags (GitLab MCP)
1. Use `gitlab_list_tags` for the two main SIGTAF repositories:
   - **Backend**: `project_id: "11"` (`cstaf/sigtaf/sigtaf-backend`)
   - **Frontend**: `project_id: "10"` (`cstaf/sigtaf/sigtaf-frontend`)
2. Find the latest production tag (e.g., `0.1.8`) and note its commit date.

### Step 3: Determine Release Delta
- If `changelog.md` already has entries, identify all tags released since the last documented tag.
- If generating for a specific tag or a historical catch-up, process versions chronologically.

### Step 4: Fetch Commits for the Version
1. Use `gitlab_list_commits` on projects `10` and `11` for the target tag:
   - Use `ref_name: "<tag>"` and `until: "<tag_commit_date>"` (and `since: "<previous_tag_commit_date>"` if available) to extract all commits that went into the release.
2. Read the commit titles and messages.

### Step 5: Filter and Classify Changes
- **Ignore technical-only chores**:
  - Pipeline / CI changes (`Remove git command from build`, `composer install`).
  - Code refactors without visible UI/functional impact.
  - Unit/integration test suites (`testes unitários`).
  - Database seeding updates.
- **Categorize user-impacting changes into 3 groups**:
  1. 🚀 **Novos Módulos & Funcionalidades** (New modules, new screens, new workflows).
  2. ✨ **Melhorias e Usabilidade** (Form improvements, visual adjustments, session duration, performance).
  3. 🛠️ **Correções de Erros** (Resolved bugs, validation fixes, UI glitches).

### Step 6: Format the Release Entry
Format each release as:

```markdown
## Versão [0.X.Y] - DD de Mês de AAAA

*(Breve resumo de uma ou duas frases destacando o foco principal desta versão)*

### 🚀 Novidades
- **[Funcionalidade]**: [Descrição clara do que o utilizador pode agora fazer.]

### ✨ Melhorias
- **[Área/Ecrã]**: [Descrição do benefício ou ajuste de usabilidade.]

### 🛠️ Correções
- **[Área/Ecrã]**: [Descrição do problema que foi resolvido.]

---
```

*(Omit any category that has no entries for that specific release)*

### Step 7: Update Wiki and Navigation
1. **Prepend** the new version block in `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/changelog/changelog.md` immediately under the introductory header so that the newest version is always at the top.
2. Ensure `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/_sidebar.md` includes the link under the appropriate section:
   ```markdown
   - **Controlo de Versões (GIT)**
     - [Tipos de Items no GIT](git/tipos_items)
     - [Trunk Based Development (TBD)](git/Trunk-Based-Development)
     - [Organização do GIT interno](git/git_repos_organization)
     - [Versionamento de Releases](git/versionamento_releases)
     - [Notas de Lançamento (Changelog)](changelog/changelog)
   ```
3. Ensure `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/home.md` also references the changelog under the GIT / Releases section.
