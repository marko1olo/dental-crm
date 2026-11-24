# AGENTS.md — Clinic MVP / DENTE Dental CRM Workspace SSOT

> 🏛️ SSOT: [`GEMINI.md`](file:///C:/Clinic_MVP/dental-crm/GEMINI.md) — 46 мандатов (8e–8bq). Claim Protocol, P0→P3, Worktree Law, Scout→Fixer — в [`.agents/THE_HAMMER_MASTER_PROMPT.md §XL–XLV`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md). Реестр замков: [`SYSTEMIC_ROT_RATCHET.md`](file:///C:/Clinic_MVP/dental-crm/SYSTEMIC_ROT_RATCHET.md).

## ⚡ ОПЕРАЦИОННЫЙ ПРОТОКОЛ ПАРАЛЛЕЛЬНОЙ РАБОТЫ

| Уровень | Правило | Примеры |
|---|---|---|
| **P0 БЛОКЕР** | Стоп. Сначала сюда. | `tsc` ошибки (`AppNavigationShell.tsx:42`), грязный worktree |
| **P1 ГНИЛЬ** | После P0. | 387+ route без `organizationId`, 170+ без `db.transaction()` |
| **P2 ДОЛГ** | При закрытых P0. | 85 `as any` (двойной счётчик!), 18-19 кубик-дефектов |
| **P3 ПЛАНОВОЕ** | При чистых P0+P1. | DDL-сквош, мусор `scripts/` |

**Claim Protocol:** Перед стартом → `🔒 [AgentId] — [скоуп] — [HH:MM DD.MM]` в RATCHET.md. После коммита → `✅ [AgentId] — DONE — commit <hash> — [ДО→ПОСЛЕ]`. Брошен >60 мин — снимает оркестратор.

**Worktree:** `git status` при старте. `git add <file>` пофайлово — запрет `git add .`. Отчёт без коммита = БРАК.

**ДО/ПОСЛЕ:** `npm run typecheck -w @dental/web` + `rg "as any" apps/ --count-matches` — оба счётчика вместе вниз. Иначе САБОТАЖ.

**Scout→Fixer:** Scout Read-Only `rg/fd/ast-grep` → досье `[ФАЙЛ:СТРОКА]` → 1:1 Verbatim эстафета → Fixer мутирует только SSOT, `git rm` дубликаты. Блоки `[ПРОВЕРЕНО: ЧИСТО]` неприкосновенны.
