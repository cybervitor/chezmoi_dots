---
name: cstaf-wiki
description: Use when the user asks to create, write, or update a wiki article, handbook guide, technical documentation, or module specification for the CSTAF handbook wiki.
---

# CSTAF Handbook & Wiki Documentation Skill

When the user asks to write, create, or document a wiki article or technical guide for the CSTAF handbook, generate a Markdown document following this standardized structure, written in European Portuguese (`pt-PT`):

```md
# [Título Claro e Conciso do Artigo/Guia]

[<- Home](../home)

[Breve introdução / resumo contextual explicando o objetivo deste documento, a que componentes/módulos se aplica e o público-alvo.]

## 1. Contexto e Objetivos
[Descreve as motivações, o problema de negócio ou técnico a resolver, e os princípios fundamentais adotados.]

## 2. Arquitetura e Regras Principais
[Explicação detalhada do fluxo, regras de negócio, convenções de código ou decisões técnicas fundamentais.]

## 3. Implementação e Código de Referência
[Exemplos de código práticos e canónicos (CakePHP, Angular, TypeScript, Bash, etc.), com tipagem explícita e comentários explicativos.]

```<linguagem>
// Exemplo de código de referência canónico
```

## 4. Boas Práticas e Cuidados (Pitfalls)
[Tabela ou lista de boas práticas e erros frequentes a evitar.]

| Cenário / Aspeto | Recomendação / O que Fazer | O que Evitar / Pitfall |
| --- | --- | --- |
| [Ex: Gestão de Estado] | [Abordagem correta] | [Prática desaconselhada] |

## 5. Comandos e Verificação
[Comandos para execução de testes, lint, build ou validação local.]

```bash
# Comandos de verificação
```
```

---

## Instructions to the Agent

1. **Identify Target Category & Directory**:
   Determine the appropriate location in the handbook wiki (`/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/`):
   - **Backend Technical Guides**: `backend/<nome_do_guia>.md`
   - **Frontend Technical Guides**: `frontend/<nome_do_guia>.md`
   - **Git & Workflow Guidelines**: `git/<nome_do_guia>.md`
   - **SIGTAF Modules**: `sigtaf/modulos/<nome_do_modulo>.md` (or subdirectories like `sigtaf/modulos/gestao_documental/`)
   - **Docker / Infrastructure**: `Docker/<nome_do_guia>.md`
   - **General Principles / Workspace**: Root level (e.g. `principios_fundamentais_de_programacao.md`, `instalacao_workspace.md`)

2. **File Naming Conventions**:
   - Use lowercase `snake_case` or `kebab-case` without accents, special characters, or spaces (e.g. `gestao_permissoes.md`, `testes_integracao.md`).

3. **No Emojis**:
   - NEVER use emojis in titles, headers, bullet points, callouts, or content. Keep documentation clean, serious, and professional.

4. **Breadcrumb / Navigation Link**:
   - If the file is in a subfolder (e.g. `backend/`), include `[<- Home](../home)` right after the title `# <Título>`.
   - If the file is at the wiki root, use `[<- Home](home)`.

5. **Sidebar Navigation Update**:
   - Read `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/_sidebar.md`.
   - Add a navigation entry for the new article under the appropriate section in `_sidebar.md` (e.g. `    - [Título do Artigo](backend/nome_do_guia)`), preserving indentation and hierarchy.

6. **Direct Execution**:
   - Save the markdown file directly to the determined path in `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/`.
   - Update `_sidebar.md`.
   - Do not ask unnecessary questions if the topic and scope are clear from context.
