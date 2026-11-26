# AGENTS.md — Clinic MVP / DENTE Dental CRM Workspace SSOT

> 🏛️ SSOT: [`GEMINI.md`](file:///C:/Clinic_MVP/dental-crm/GEMINI.md) (46 мандатов `8e..8bq`). Конституция и волны P0→P3: [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и [`.agents/architecture/GLOBAL_ARCHITECTURAL_REMEDIATION_PLAN.md`](file:///C:/Clinic_MVP/dental-crm/.agents/architecture/GLOBAL_ARCHITECTURAL_REMEDIATION_PLAN.md). Реестр: [`SYSTEMIC_ROT_RATCHET.md`](file:///C:/Clinic_MVP/dental-crm/SYSTEMIC_ROT_RATCHET.md).

## ⚡ ОПЕРАЦИОННЫЙ ПРОТОКОЛ ПАРАЛЛЕЛЬНОЙ РАБОТЫ

| Уровень | Правило | Фокус класса задач |
|---|---|---|
| **P0 БЛОКЕР** | Стоп. Сначала сюда. | Грязный worktree, сбои `tsc` (`shared`/`api`/`web`), битые импорты каркаса |
| **P1 ГНИЛЬ** | После P0. | Типизированные фабрики маршрутов (`onRoute` -> `READ ONLY`/stream/mutation), единый контур отзыва сессий, единый леджер возвратов и ЗП, полное потоковое DR-восстановление и инвентаризация |
| **P2 ДОЛГ** | При закрытых P0. | `as any` (двойной счётчик!), `audit:dice` дефекты, снос legacy `*Rub -> *Kopecks BIGINT`, 3-Shell / Wheeler SVG `#id` / Flat Modal Stack |
| **P3 ПЛАНОВОЕ** | После стабилизации ядра. | Сквош исторических миграций DDL, консолидация устаревших алиасов API, зачистка одноразовых скриптов |

**Claim Protocol:** Старт → `🔒 [AgentId] — [скоуп] — [HH:MM DD.MM]` в `SYSTEMIC_ROT_RATCHET.md`. Коммит → `✅ [AgentId] — DONE — commit <hash> — [ДО→ПОСЛЕ]`. Брошен `>60 мин` — снимает оркестратор.
**Worktree & Main-Only:** Всегда `main` (`git checkout -b` = бан). `git status` на старте; `git add <file>` пофайлово (запрет `git add .`). Отчёт без коммита = БРАК.
**ДО/ПОСЛЕ & Honest Tests:** Таргетные тесты (без source-grep/фантомов, Часть 6Г), счётчики `any`/`tsc` оба вниз (`global typecheck` запускает L1, воркеры — таргетно `tsc | Select-String`).
**Scout→Fixer:** Scout Read-Only (`git grep`/`ast-grep`) → 1:1 Verbatim досье `[ФАЙЛ:СТРОКА]` → Fixer правит SSOT, `git rm` дубли (2FP). `[ПРОВЕРЕНО: ЧИСТО]` неприкосновенно.
