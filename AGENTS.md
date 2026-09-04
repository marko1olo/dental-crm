# AGENTS.md — Clinic MVP / DENTE Dental CRM

> ⚠️ **ВЫСШАЯ КОНСТИТУЦИЯ (THE SUPREME LAW):** **[`C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** (и его зеркало `MASTER_PROMPT.md`) — абсолютный непреложный закон. Обязателен к прочтению от первого до последнего символа перед началом любых действий!
>
> **СИСТЕМНАЯ КОНСТИТУЦИЯ:** **[`.agents/AGENTS.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AGENTS.md)**. Этот корневой файл — discoverable standard entry point (конвенция AGENTS.md для Codex, Copilot, Cursor, Windsurf, Claude). Он индексирует документацию и фиксирует главные нерушимые правила.

## 📖 AGENT DOCUMENTATION INDEX
Before starting any development or refactoring, you MUST load and read the following modular directories:
- **[Documentation Index & Navigation Matrix](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Entry point to the system and AI Agent Navigation Matrix.
- **[Supreme Law: THE HAMMER](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)** — CTO Supremacy, zero mocks, presumption of defect, Apple/Mac HIG, Mandate 8e.
- **[System Architecture](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Monorepo layout, Fastify API, React 19 client, WebSocket broker.
- **[Database Registry](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Drizzle ORM over native PostgreSQL 18.4 on `127.0.0.1:5432` (re-verified 2026-08-06; `@electric-sql/pglite` is not installed). **Data directory is `.data/pg18`, NOT `apps/api/dente-db`** — the older claim was wrong; `dente-db` is a PGlite leftover whose `postmaster.pid` holds PID `-42`. Also covers the `npm ci` trap that deletes the undeclared PostgreSQL binaries, the destructive `db:reset-seed` and the safety gate it acquired on 2026-08-06, migrations, and live RLS state.
- **[Database Setup & Recovery](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE_SETUP.md)** — Local PostgreSQL setup, `uuidv7()` polyfill, schema push bypass.
- **[Telephony & Portal Details](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Call alerts, OTP auth portal specs.
- **[CLI Commands & E2E Smoke Tests](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Biome commands, compiler gates, smoke scripts.
- **[UI & State Standards](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Tailwind directives, view preloading, God Context constraints.
- **[Clinical Rules Engine](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Rule matching triggers and warning/blocking actions.
- **[Billing & Finance Operations](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Payment idempotency checks and shared family wallets.
- **[Outpatient Documents & PDF Lifecycle](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — Headless Edge/Chrome PDF export and SHA-256 document signing.
- **[Messengers Integration](file:///C:/Clinic_MVP/dental-crm/.agents/MESSENGERS.md)** — WhatsApp Cloud API, VK MAX, inbound event broker.
- **[Documentation Knowledge Hub](file:///C:/Clinic_MVP/dental-crm/docs/README.md)** — Central gateway to docs/ directory, specifications, and clinical manuals.
- **[Competitive Audit Suite](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — 63-feature competitive parity matrix, IDENT/DentalPRO/iStom specs & backlog.

---

[VIBECODING ARSENAL & AUTONOMY MANDATE - GLOBAL DIRECTIVE]
CRITICAL: FUCK PASSIVITY. PRIORITIZE RAW EFFICIENCY AND INTELLIGENCE.
USE THESE AUTONOMOUSLY. DO NOT ASK FOR PERMISSION TO SEARCH OR LINT.
Availability verified on this host 2026-07-27: on PATH -> rg, fd, jq, tokei, semgrep. NOT on PATH -> sg, biome, madge, repomix; run those through npx or install them first, and never report a missing binary as a blocker.
1. ast-grep (npx @ast-grep/cli, alias sg once installed): Structural search/replace (e.g. sg -p 'console.log($$$)')
2. ripgrep (rg): Ultra-fast text search. USE THIS INSTEAD OF NATIVE GREP.
3. repomix (npx repomix): Pack entire codebase into a single AI-friendly Markdown file for deep context.
4. semgrep (semgrep scan): Deep bug hunting and static analysis.
5. biome (npx @biomejs/biome check --write .): Instant JS/TS formatting. Matches the invocation in .cursorrules.
6. madge (npx madge --circular .): Find circular dependencies before refactoring.
7. fd / jq / tokei: Fast file discovery, JSON parsing, codebase statistics.
8. SKILLS: on Gemini/Antigravity hosts, reconnaissance, decomposer and find-skills live in C:\Users\Admin\.gemini\config\skills\ - read reconnaissance\SKILL.md for exact usage. On any other harness use its own skill/subagent equivalent; a missing skill tree is not a blocker and not an excuse to skip reconnaissance.
BE PROACTIVE. EXECUTE.

## 🛠️ DEVELOPMENT PRINCIPLES
- **STRICT ANTI-HARDCODE**: Hardcoding configuration, text values, ports, database credentials, or endpoints is banned. All variables must be parametrizable, interfaces should be used for decoupling, and properties must be exported to configs/env files.
- **THINK AND READ BEFORE WRITING**: Always read the targeted file in full before editing. Understand the logic instead of dumping a quick-fix at the end of the file.
- **MODULAR DESIGN**: Avoid producing monolithic components and spaghetti/dead code. Refactor proactively.
- **DESIGN ADAPTABILITY**:
  - *Multi-Language (i18n)*: Decouple strings from components. Design layouts to support varying word lengths (especially long Russian words) without clipping.
  - *Multi-Theme*: Proactively support light, dark, and system schemes. Use CSS variables or Tailwind tokens; do not hardcode static colors.


## 📸 SCREENSHOT PROOF LAW (MANDATORY VERIFICATION RULES)
1. **LIVE SERVER ONLY**: Screenshots must ONLY be captured from a live, running server (`HTTP 200 OK`). Before capturing, execute `curl -i` for frontend and backend. `page.goto` MUST NOT use `.catch()` error suppressors. If a server is down, the capture script MUST throw an explicit error instead of capturing blank/500 screens.
2. **UNIQUE SCREENS & REAL NAVIGATION**: Every screenshot must represent a distinct feature with genuine route navigation, active user session/token, data seeding, and explicit `page.waitForSelector`. Do NOT clone `body` screenshots across a loop.
3. **SELF-AUDIT HASH & CONTENT CHECK**: Before submitting any screenshot:
   - Verify all file MD5 hashes are strictly **UNIQUE**.
   - Verify file sizes are $\ge$ ~40 KB for data screens (4–8 KB empty/error screenshots are strictly rejected).
   - Verify no "Server Error", 500, or blank error bodies are present.
4. **MANDATORY PIXEL INSPECTION**: The agent MUST open every PNG file using `view_file` and inspect the visual pixels with its own eyes BEFORE describing it in the report. The report caption MUST accurately state the exact pixel content. Describing uninspected or broken screenshots is treated as evidence fabrication.
5. **TRUTH IN REPORTING**: 1 honest screenshot > 9 fake/cloned screenshots. If a UI feature cannot be visually captured or rendered, log it honestly as a DEBT item. Never pass off an unrendered screen as working.

## 🔨 МАКСИМАЛЬНАЯ КРИТИКА НА КАЖДОМ УРОВНЕ И ПОБУКВЕННЫЕ ОТЧЕТЫ (THE HAMMER INQUISITION)
1. **ЖЕСТКАЯ КРИТИКА НА КАЖДОМ УРОВНЕ:** Требование максимальной критики действует на ВСЕХ уровнях без исключения (L1 Orchestrator, L2 Leads, L3 Workers, Red Team Critics). Каждый уровень обязан непрерывно критиковать входящий и собственный код, искать скрытые дефекты, проверять законы дизайна (Хик, Миллер, Фиттс, Якоб) и презумпцию брака.
2. **ПОБУКВЕННЫЕ ОТЧЕТЫ БЕЗ КУПЮР:** Агенты других уровней, когда отчитываются, ОБЯЗАНЫ в отчете ПОБУКВЕННО приводить полные оригинальные отчеты своих субагентов с их критикой, дефект-листами и комментариями к ним. Запрещено умалчивать, обрезать или пересказывать отчеты субагентов.

## 🛑 МАНДАТ 8e: АБСОЛЮТНЫЙ ЗАПРЕТ НА ПАЛКИ В КОЛЁСА ВРАЧАМ И ПЕРСОНАЛУ (DOCTOR AUTONOMY)
1. **Софт для врача, а не врач для софта:** В частной стоматологической клинике софт обязан помогать врачу лечить людей, а не служить бюрократическим цербером. Любое препятствие, блокировка, лишний клик или искусственный запрет — это брак.
2. **Никаких заблокированных кнопок без причины:** Кнопки «Сохранить», «Завершить приём», «Добавить услугу», «Печать» НИКОГДА не должны быть серыми (`disabled`) из-за незаполненных второстепенных полей (пульс, температура, влажность, 50 пунктов соматической анкеты).
3. **Физиологическая норма по умолчанию:** Все осмотры и анамнез заполняются физиологической нормой в 1 клик («Соматически здоров / норма»). Врач правит только патологию.
4. **Никаких запретов на черновики и согласований начмедов:** Врач свободно правит свои дневники в 1 клик с версионным аудитом («Исправленному верить»). Запрещены 24-часовые замки намертво.
5. **Печать в любой момент:** Форма 043/у, согласия и сметы печатаются в любой момент: если приём не закрыт — со штампом «ЧЕРНОВИК», если закрыт — «ПОДПИСАНО ВРАЧОМ».
6. **Защита от потери данных (Autosave):** Любой набранный врачом текст сохраняется на лету (debounced autosave). Смена вкладки, закрытие панели или входящий звонок телефонии НИКОГДА не уничтожают черновик визита.
7. **Свобода скидок и переделок:** Врач имеет право применить скидку (вплоть до 100% на гарантийные переделки и персонал) без ввода мастер-паролей администратора. Истечение 30 дней с момента составления плана лечения НЕ БЛОКИРУЕТ создание нарядов ЗТЛ, оказание услуг или оплату.
8. **Регистратура без палок в колёса:** Запрещено требовать обязательного выбора ассистента при создании записи в расписании. Регистратор имеет право распечатать пустой договор со строками `_______` для ручного заполнения без 403-ошибок.
9. **Касса 54-ФЗ без палок в колёса:** Запрещено требовать ИНН с физических лиц при оплате наличными или картой (по 54-ФЗ ИНН нужен только юрлицам/ИП). Касса обязана принимать комбинированную оплату (нал + карта + аванс/бонусы) в 1 клик.
10. **Склад и медсестра:** Медсестра списывает пустые карпулы анестетиков в 1 клик без комиссии из 3 человек. Мягкий овердрафт склада с предупреждением вместо блокировки операции.

## 🍏 СТАНДАРТЫ ЭРГОНОМИКИ И ВЕРСТКИ APPLE & MAC (STUDIO CLINICAL HIG)
1. **Десктопная панель пилота (80% сценариев):** Плотная профессиональная компоновка, компактные тулбары (32–36px), хоткеи (`Cmd/Ctrl+K`, `Esc`), 150ms Hover HUD, 0-клик касса 54-ФЗ и зубная формула.
2. **Мобильная и планшетная эргономика (10% сценариев):** Тач-таргеты строго $\ge 44\times 44\text{px}$, нативный Segmented Control вместо 2500px скролла смет.
3. **Закон Анти-Матрёшки:** Максимальная глубина модальных окон — СТРОГО 1. Карточки внутри карточек запрещены.
4. **Медицинская типографика:** Никаких эмодзи в картах 043/у, актах, чеках — только строгие векторные иконки Lucide.




