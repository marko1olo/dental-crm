# AGENTS.md — Clinic MVP / DENTE Dental CRM Workspace SSOT

> 🏛️ WORKSPACE SINGLE SOURCE OF TRUTH (SSOT):  
> Единым операционным авторитетом монорепозитория является канонический файл [`GEMINI.md`](file:///C:/Clinic_MVP/dental-crm/GEMINI.md).  
> Все 46 мандатов (8e–8bq), Claim Protocol, P0→P3 очередь, Законы чистого worktree и закрытого цикла зафиксированы в нём и в [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) §XL–XLV.

---

## ⚡ ОПЕРАЦИОННЫЙ ПРОТОКОЛ ПАРАЛЛЕЛЬНОЙ РАБОТЫ

### 1. Приоритетная очередь P0 → P3 (читать ПЕРЕД стартом любой задачи)

| Уровень | Смысл | Примеры |
|---|---|---|
| **P0 — БЛОКЕР** | Стоп. Сначала сюда. | Web `tsc` ошибки (`AppNavigationShell.tsx:42`), незакоммиченный worktree |
| **P1 — ГНИЛЬ** | Системный риск. Берём после P0. | 387+ route без `organizationId`, 170+ без `db.transaction()`, 760+ `console.log` |
| **P2 — ДОЛГ** | Технический долг. Берём при закрытых P0. | 85 `as any` (двойной счётчик!), 18-19 кубик-дефектов |
| **P3 — ПЛАНОВОЕ** | Только при чистых P0+P1. | DDL-сквош миграций, мусор `scripts/` |

> **Правило:** P2 нельзя брать при открытых P0. P3 — только при закрытых P0+P1. Нарушение = саботаж.

### 2. Claim Protocol (обязателен при параллельной работе роя)

```
# Перед стартом — добавить строку в SYSTEMIC_ROT_RATCHET.md раздел "АКТИВНЫЕ CLAIM-ЗАМКИ":
🔒 [AgentId/имя] — [точный скоуп: папка/файл] — [HH:MM DD.MM]

# После коммита — снять замок:
✅ [AgentId] — DONE — commit <hash> — [метрика ДО → ПОСЛЕ]

# Брошенный claim (>60 мин без коммита) — снимает оркестратор принудительно.
```

> Два агента на один файл без claim = конфликт слияния и двойная работа. Claim — страховка, не бюрократия.

### 3. Закон чистого worktree

1. `git status --short` при старте — смотри чужие незакоммиченные файлы.
2. Правишь файл → `git add <file>` **пофайлово** (тотальный запрет `git add .`).
3. Отчёт «готово» при незакоммиченных файлах скоупа = **БРАК**. Комитить до отчёта.
4. При 400+ грязных файлах — группировать по доменам и коммитить пакетами (`fix(finance):`, `fix(api):`).

### 4. Мандат замера ДО/ПОСЛЕ (Закон двойного счётчика)

```powershell
# ДО любой правки — снять оба счётчика:
npm run typecheck -w @dental/web 2>&1 | Select-String "error TS" | Measure-Object -Line
rg "as any|as unknown as" apps/ --count-matches

# ПОСЛЕ коммита — снять снова и сравнить:
# Оба числа должны идти ТОЛЬКО вниз. Рост или стагнация any при падении tsc = БРАК И САБОТАЖ.
```

> Отчёт без пары цифр ДО/ПОСЛЕ — возврат на доработку. Половина замера не считается.

### 5. Закон закрытого цикла (эстафета Scout → Fixer)

- **Scout (Read-Only):** `rg/fd/ast-grep` → Fact Dossier с цитатой `[ФАЙЛ:СТРОКА]`. Запрещено трогать код.
- **Эстафета 1:1 Verbatim:** Оркестратор пересылает досье Fixer'у слово в слово, без купюр.
- **Fixer:** мутирует ТОЛЬКО канонический SSOT, `git rm` дубликаты. Запрет клонов (`*V2`, `*New`).
- Блоки `[ПРОВЕРЕНО: ЧИСТО]` — неприкосновенны. Касаться = саботаж.

### 6. Операционные ссылки

- Реестр замков: [`SYSTEMIC_ROT_RATCHET.md §АКТИВНЫЕ CLAIM-ЗАМКИ`](file:///C:/Clinic_MVP/dental-crm/SYSTEMIC_ROT_RATCHET.md)
- Конституция §XL–XLV: [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)
- P0 ticket: `AppNavigationShell.tsx:42` → TS2322 `continueOnboardingInDraftMode`
