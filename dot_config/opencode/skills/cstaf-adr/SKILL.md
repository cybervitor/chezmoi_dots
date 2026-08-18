---
name: cstaf-adr
description: Use ONLY when the user asks to document an architectural decision, write an ADR, or record a technical choice for the future.
---

# CSTAF Architectural Decision Record (ADR)

When the user asks to write an ADR, you must generate a Markdown document following this EXACT structure, translated into Portuguese as per the handbook guidelines:

```md
**Titulo:** ADR-[NUMERO]-[NOME_CURTO]  
**Estado:** [Aceite / Rejeitada / Proposta]
**Data:** [Data de hoje no formato DD/MM/YYYY]  
**Autor:** [Nome do autor ou "Equipa CSTAF"]

**Contexto:**
[Descreve as condições ou mudanças de condições que levaram à tomada desta decisão. Qual é o problema que estamos a tentar resolver?]

**Decisão:**
[O que foi decidido que íamos fazer de forma clara e direta.]

**Consequências:**
[O que é implicado por esta decisão. Quais são os trade-offs? Existe algum impacto negativo ou dívida técnica introduzida que não era pretendida?]
```

**Instructions to the Agent:**
1. Fill in the template based on the conversation context.
2. Check existing files in `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/ADRs/` to determine the highest existing 4-digit prefix (`NNNN`). Increment it to get the next number (e.g. `0008`).
3. Set the title to `ADR-[NNNN]-[NOME_CURTO]` matching the number.
4. Output the markdown content and save the resulting ADR directly to `/home/cybervitor/Projects/CSTAF/handbook/handbook.wiki/ADRs/NNNN-nome-curto.md` (kebab-case, 4-digit zero-padded prefix). Do not ask where to save it.
