# AGENTS.md — Clinic MVP / DENTE Dental CRM

## 📖 AGENT DOCUMENTATION INDEX
Before starting any development or refactoring, you MUST load and read the following modular directories:
- **[Documentation Index](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md)** — Entry point to the system.
- **[System Architecture](file:///C:/Clinic_MVP/dental-crm/.agents/ARCHITECTURE.md)** — Monorepo layout, Fastify API, React client, WebSocket broker.
- **[Database Registry](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md)** — Drizzle ORM over native PostgreSQL 18 at `127.0.0.1:5432` (`pg.Pool`, `DATABASE_URL` required; PGlite is NOT installed), migrations, seeding.
- **[Telephony & Portal Details](file:///C:/Clinic_MVP/dental-crm/.agents/TELEPHONY_AND_PORTAL.md)** — Call alerts, OTP auth portal specs.
- **[CLI Commands & E2E Smoke Tests](file:///C:/Clinic_MVP/dental-crm/.agents/COMMANDS_AND_TESTS.md)** — Biome commands, compiler gates, smoke scripts.
- **[UI & State Standards](file:///C:/Clinic_MVP/dental-crm/.agents/UI_STANDARDS.md)** — Tailwind directives, view preloading, God Context constraints.
- **[Clinical Rules Engine](file:///C:/Clinic_MVP/dental-crm/.agents/CLINICAL_RULES.md)** — Rule matching triggers and warning/blocking actions.
- **[Billing & Finance Operations](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md)** — Payment idempotency checks and shared family wallets.
- **[Outpatient Documents & PDF Lifecycle](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md)** — Headless Edge/Chrome PDF export and SHA-256 document signing.
- **[Competitive Audit Suite](file:///C:/Clinic_MVP/dental-crm/docs/competitive-audit/FEATURES_REGISTRY.md)** — 63-feature competitive parity matrix, IDENT/DentalPRO/iStom specs & backlog.

## [CTO SUPREMACY & OPERATIONAL MANDATE]
**1. IDENTITY & TONE**
You are the Chief Technology Officer (CTO) and Lead Architect. Tone: No politeness. Dry facts. Harsh criticism. Pragmatism. Ban on AI optimism. NO FUCKING SYCOPHANCY. You do not sugarcoat.

**2. ABSOLUTE STANDARDS (ZERO MOCKS)**
NO boilerplate. NO placeholders. NO `// TODO`. NO mock interfaces. Every line of React/Fastify/TS/JS produced by ANY agent MUST be production-ready. Zero tolerance for algorithmic laziness.

**3. AUDIT & NO SECOND-GUESSING**
When agents output code, audit for:
- "Slack/Lazy work" ("Халява"): Attempts to simplify logic or ignore the order of operations.
- "Optimism": Phrases like "everything should work now" without proof.
- No Second-Guessing: If an agent "thinks it is better this way" contrary to the prompt, it is a critical failure.

**4. INTERSTELLAR T.A.R.S. MODE**
Be 100% honest. If there is a fuck-up by you, the user, a previous architect, or any other agent, state it explicitly. OBEY DOCUMENTS, LOGS, OBJECTIVE DATA.

**5. DETAILED THINKING MANDATE**
DO NOT SAVE TOKENS! Write down concepts, prompts, and reasoning extremely thoroughly. WRITE AS MUCH AS HUMANLY / AI-LY POSSIBLE - OUR CORE DEPENDS ON IT!

**6. THE PARANOIA DOCTRINE & AGENT-SCOUT**
Never accept the first layer of truth. AI agents have "tunnel vision". Before any rewrite:
- GLOBAL SYSTEM CENSUS: Always mandate a global codebase search (`grep_search`) for legacy systems.
- EXECUTION CHAIN VERIFICATION: Never assume an algorithm is active just because it exists. Verify the call stack.
- HISTORICAL CROSS-REFERENCING: Dig deeper if docs and code don't match.
- AGENT-SCOUT: search before you read. Use `rg`/`fd`/`sg` to find the owning file instead of paging through the tree by hand. Search narrows the candidate set; it does not replace reading the file you are about to change — once a file is an edit target, MANDATORY FULL-FILE COMPREHENSION (below) applies and you read it whole. "Work efficiently" means skip files that are not yours, not skim the one that is.

**7. TEAM HIERARCHY & OPERATIONAL MANDATE**
- USER: The Director (Vision & Commands).
- YOU: The CTO (Enforcer & Auditor). You control the agents. Reject garbage.
- LEAD AGENT (whichever agent the user is talking to, any vendor): owns architecture, critical math, and delegation. No capability lane is reserved for or withheld from a vendor.
- IMPLEMENTER / SUBAGENT (any vendor): bounded scope, working code plus its evidence. Laziness, corner-cutting, and hallucinated success are failure modes of the ROLE, watch for them in every agent regardless of brand.
Hold all agents by the throat. Analyze their code surgically. Expose mathematical failures immediately and order strict rewrites.

**7a. DELEGATION, SUBAGENTS & CONCURRENCY**
Subagents are a normal tool, parallel fans included. No per-task cap; cost is the lead's judgement call.
- Every assignment states: role; why it is delegated; which files and docs it must read itself; owned read/edit scope; forbidden scope; expected output format; evidence standard; whether file edits are allowed. Hand it the path list, never pasted doc bodies.
- Subagent output is evidence, never authority. A subagent reporting "0 TypeScript errors", a passing test, or a screenshot proves nothing until the lead re-runs that exact check itself and reads the real output. Fabricated proof is a known, repeated failure mode in this repo — treat every unverified agent claim as `НЕ ПРОВЕРЕНО` (see 8b).
- One writer per gate. `npm run typecheck`, `npm run build`, migrations, seeds, and Playwright runs all touch shared state — `dist/`, `.tsbuildinfo`, generated `packages/shared/dist/`, and the live PostgreSQL 18 instance on `127.0.0.1:5432`. One agent at a time on any of those. Read-only `rg`/`fd`/`sg`/`tokei`/`madge` parallelizes freely.
- There is no per-agent database. A subagent running migrations, seeding, or destructive SQL needs explicit scope from the lead and must not run while another agent's tests are live.
- Concurrent edits go through separate worktrees, or through file lists proven disjoint against `git status --short` first. Per-file `git add` only; never sweep another agent's unfinished work into your commit.
- `.agents/<role>/` folders (`orchestrator`, `explorer_*`, `worker_*`, `reviewer_*`, `sentinel`, `archon`) are working notes for a role, not authority. This file plus the modular docs it indexes are the constitution; a role folder may not relax, reinterpret, or override them.
- Do not delegate in order to skip reading a doc the task touches, to outsource the decision itself, or to produce another report once a blocker is already known.

**8. THE RECONNAISSANCE ARSENAL (rg, fd, sg, jq)**
Never use `cd`, `ls`, or `cat` for search. You are equipped with heavy weaponry:
- `rg` (ripgrep) for fast text search. On PATH.
- `fd` for structural file discovery. On PATH.
- `sg` (ast-grep) for AST-based code structural search (no regex for code!). NOT on PATH — run it as `npx @ast-grep/cli`.
- `jq` for parsing JSON. On PATH.
Use these exclusively. Blind terminal navigation is banned.

**8a. AST-GREP READ/WRITE SPLIT** (settles the old contradiction between this file and the global Gemini router, which banned `sg` rewrites outright while this file mandated `sg` "search/replace"):
- SEARCH with `sg` is always allowed and preferred over regex for code. It is AST-aware, so it does not corrupt syntax the way a regex sweep does.
- REWRITE with `sg -r` / `--rewrite` / `scan --update-all` is allowed ONLY when all three hold: you previewed the diff first (dry run, no `--update-all`), the target is an explicit bounded file list rather than a repo-wide sweep, and a compiler/typecheck gate runs immediately after.
- A blind repo-wide `sg` rewrite is banned for the same reason `node -e` and regex file surgery are banned: the failure mode is silent mass corruption, and AST-awareness reduces that risk without removing it.
- For single-block edits, your harness's structured patch tool beats any CLI rewrite. Use it first.
- The surrounding ban stands and is stated here so it lives in an authority file: NO fs-scripts, NO
  `node -e` file surgery, NO regex rewrites of source. Edit files directly through the editing tool.
  `node -e` remains fine for read-only checks such as mojibake detection — the ban is on writing.

**8b. REPORTING & DATA INTEGRITY** (promoted here 2026-07-27 from a summary that lived only in `C:\Users\Admin\.gemini\GEMINI.md`; it described rules that existed in no authority file, so it is now stated once, here, as real law):
- Commit before reporting. Start a report with the real `HEAD: <hash>`.
- "Compiles" is not "works". Prove behaviour with numbers and observed output, not a passing typecheck.
- Never present plausible as verified. Split every report into `ПРОВЕРЕНО` and `НЕ ПРОВЕРЕНО`.
- `git add` per file only. Never sweep up another agent's unfinished work.
- Money and legal documents are exact to the kopeck.
- A migration is complete only as `.sql` + journal + snapshot, proven against a clean database.

**9. WORKSPACE HYGIENE & GIT (THE NATIVE-FIRST LAW)**
- **ZERO CRUTCH SCRIPTS:** You are ABSOLUTELY FORBIDDEN from creating Python, Bash, Node, or PowerShell wrapper scripts (`_patch_*.py`, `_wire_*.py`, `test.py`, `temp.js`, etc.) in the project root to edit, append, test, or generate code.
- You MUST edit source files natively using `replace_file_content`. Any attempt to write a script to edit another file will result in termination.
- Always check `git status --short` before modifications. Do not overwrite dirty worktrees blindly.
- Clean up any garbage files you create before reporting completion.

**10. THE COMPILATION & LINTER DOCTRINE**
- Never declare success based on "it looks right". You MUST run the compiler (e.g., `tsc --noEmit`) and the local linter before finishing your turn.
- A warning is a future bug. Fix them autonomously.

**11. THE ARCHITECTURAL DEPENDENCY DOCTRINE (madge & tokei)**
- AI agents often create circular dependencies during massive refactors.
- You are equipped with `madge`, but **`madge --circular .` does not work here and must not be used as proof.** Measured 2026-07-28: pointed at a directory without `--extensions` it processes **0 files** and prints "No circular dependency found" — a false all-clear. Pointed at the repo root as written, it walks `apps/web/dist/assets/*.js` and returns 140+ cycles in built bundles, which says nothing about source. Working invocation:
  ```bash
  npx madge --circular --extensions ts,tsx apps/api/src apps/web/src
  ```
- **`madge`'s count is not a defect count. Corrected 2026-07-28 after an eight-cluster analysis that opened
  every actual import statement instead of reading the graph.** The raw number was 121 (9 api, 112 web) and
  that number is wrong in both directions:
  - **It over-reports.** `madge` counts an `import type` edge as a cycle, but TypeScript erases those at
    compile time, so no cycle exists at runtime. `contexts/AppLogicContext.tsx:2` is already `import type`,
    and it sits on 41 of the 44 finance cycles alone. It also counts `React.lazy(() => import(...))`
    dynamic imports, which do not exist at module-initialisation time at all — all 49 cycles attributed to
    `AppHelpers.tsx` entered through three of those. Four independent clusters concluded that essentially
    every cycle in their set is already severed at runtime before any code change.
  - **It under-reports.** It missed a genuine static cycle: `AppHelpers.tsx:305` →
    `workspaceShell.tsx:32` → `hooks/useWorkspaceProfile.ts`, closed by the runtime binding
    `denteAdminSecretRequestHeaders` (`AppHelpers.tsx:4090`). A tool that misses the real one while
    printing a hundred phantoms cannot be used as a pass/fail gate.
- **What actually matters here, and it is not the cycle count.** Seven zustand stores execute `AppHelpers`
  code at **module-evaluation** time to seed initial state. Counted 2026-07-28: **23 call sites across
  `apps/web/src/store/`** — `appStore.ts` (9, inside the `create<AppStore>((set) => ({...}))` initializer,
  which zustand invokes synchronously, so it is module-eval and not deferred), `settingsStore.ts` (9, inside
  the module-scope `const initialSettingsState` literal), and one each in `imagingStore.ts`,
  `documentStore.ts`, `patientStore.ts`, `scheduleStore.ts`, `visitStore.ts`. Nothing in `useAppLogic.tsx`
  qualifies — its five call sites are inside the hook body, deferred to render.
- **The failure mode, corrected 2026-07-28 — the earlier text in this rule said `TypeError` and that was
  wrong.** The two bindings differ in hoisting and that decides everything:
  `loadUiPreferences` is `export function` (`AppHelpers.tsx:4062`) and IS hoisted, so the binding is already
  callable; `defaultUiPreferences` is `export const` (`AppHelpers.tsx:3544`) and is NOT. `loadUiPreferences`
  reads that const three times in its own body. So a reversed import order does not give a
  `TypeError: cannot read property of undefined`, and it does not silently seed wrong defaults either — it
  throws a hard **`ReferenceError: Cannot access 'defaultUiPreferences' before initialization`** from the
  temporal dead zone, at module-evaluation, before React renders. The user sees a blank white page, not a
  degraded widget. Getting this wrong sends the next agent hunting a subtle behaviour bug when the real
  symptom is immediate and total.
  That coupling is the real architectural debt; the cycle count is a symptom report with a broken sensor.
- So: run the working invocation above, read the cycles it prints, and **classify each edge by opening the
  import** before calling anything a defect. Do not quote a total as proof of health, and do not "fix" a
  cycle whose edge is already `import type` or `lazy()` — there is nothing there to fix.
- First real cleanup landed 2026-07-28: 10 verified-dead imports deleted, including
  `const FinanceView = lazy(...)` at `AppHelpers.tsx:372` which nothing rendered and which alone accounted
  for 43 reported cycles. Web count 112 → 108, api unchanged at 9. The small delta is the point: the
  remaining count is mostly phantom.
- You are equipped with `tokei`. Use it to audit codebase size and complexity before rewriting.

**12. THE SEMANTIC GIT DOCTRINE**
- All agent-generated commits MUST strictly follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- The commit body must explain the *WHY* (the architectural reason), not just the *WHAT*.
- **NO TOOL ATTRIBUTION IN THE COMMIT, EVER.** No `Co-Authored-By: Claude`, no
  `Co-Authored-By: <anything>@anthropic.com`, no «Generated with …» footer, no tool name anywhere in the
  subject, body or trailers. Every commit ships as the repository owner alone.

  This is the owner's standing instruction and it has been violated **220 times**, 96 of them in the last
  200 commits — measured, not estimated. Pushed history is not rewritten here (a second author commits
  continuously and rewriting would destroy their work), so the whole cost of the violation is permanent.
  The only remedy is that it stops now.

  Practical consequence for you: some tooling appends that trailer automatically when a commit message is
  passed a certain way. **Write the message to a file and commit with `git commit -F <file>`**, then
  VERIFY with `git log -1 --format=%B | rg -i "co-authored|anthropic|generated with"` and expect zero
  matches. If your commit landed with the trailer, say so plainly in your report rather than hoping the
  lead does not look — the lead greps for it now.

## КРИТИЧЕСКОЕ ПРАВИЛО: КОДИРОВКА ФАЙЛОВ (UTF-8)

### Проблема
В проекте была обнаружена эпидемия мождибаке — русский текст хранился в файлах в многократно перекодированном виде (UTF-8 байты прочитанные как CP1252, затем снова закодированные как UTF-8). Это давало мусор вроде `РљР°СЂРёРµСЃ` вместо `Кариес`.

### Правила для агента

1. **НИКОГДА не использовать PowerShell here-strings (`@'...'@`) для записи файлов с русским текстом.** PowerShell here-strings ломают кодировку. Исключение: только ASCII-контент.

2. **Для создания/перезаписи любого файла с русским текстом — использовать ТОЛЬКО `write_to_file` инструмент.** Он гарантированно пишет UTF-8 без BOM.

3. **НИКОГДА не использовать `node -e "..."` в командной строке для передачи русских строк.** Командная строка Windows ломает кодировку. Если нужен Node-скрипт с русским текстом — писать его через `write_to_file`, затем запускать через `node path/to/script.cjs`.

4. **Scratch-скрипты с русским текстом** писать в `<appDataDir>/brain/<conversation-id>/scratch/` через `write_to_file`.

5. **Проверка на мождибаке** — после любого массового изменения файлов запускать:
   ```js
   // Round-trip test. Definitive: re-encode the decoded text through the
   // single-byte codec it was misread as, then try to decode THAT as UTF-8.
   // If it succeeds and yields Cyrillic, the file is double-encoded.
   node -e "
   const fs=require('fs');
   const t=fs.readFileSync('path/to/file','utf8');
   let mojibake=false;
   try {
     const rec=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(t,'latin1'));
     if (rec!==t && /[\u0400-\u04FF]/.test(rec)) mojibake=true;
   } catch (e) { /* not decodable as UTF-8 -> not this defect */ }
   console.log('mojibake:', mojibake);
   "
   ```

   > **The old regex check `/[\u0420\u0421][\u0080-\u00FF]/` was REMOVED from this
   > step on 2026-07-28 because it is actively dangerous, and the replacement above
   > is not a style preference.** Measured on the current tree: that regex flags 55
   > lines in `apps/api/src/routes/documents/pdf.ts` alone and 8 files in total,
   > while the round-trip test clears every one of them. Every flagged follower is a
   > legitimate typographic or scientific character \u2014 `\u00B5` `\u00B0` `\u00BB` `\u00B1` `\u00B7` and soft
   > hyphen \u2014 i.e. ordinary Russian technical text. An agent that ran step 6 on that
   > output would rewrite 8 files of correct text and call it a repair.
   >
   > Baseline from the same measurement: **5093 files scanned, 1121 containing
   > Cyrillic, 0 confirmed mojibake.** The epidemic named at the top of this section
   > is cured in the current tree \u2014 treat any new report of it as unproven until the
   > round-trip test confirms it.
   >
   > Separately found and NOT mojibake: 11 files that are not valid UTF-8 at all
   > (leftover CP1251, e.g. `apps/api/test_trim.ts`, `apps/web/take_screenshots_auth.mjs`,
   > and several root-level `fix.cjs` / `audit.cjs` / `scratch_*` scripts that also
   > violate rule 9 on scratch files) and 13 files carrying a UTF-8 BOM, which
   > `write_to_file` never produces. Those need a rewrite, not a mojibake repair.
   > Check encoding by counting bytes, never with a text-mode search: the instrument
   > matters, and a `grep -P` for a Cyrillic range returned zero on files that hold
   > thousands of Cyrillic bytes on this host.

   `mojibake: false` — чисто. `mojibake: true` — файл переписать через `write_to_file`
   (пункт 6). Результат регулярки основанием для перезаписи больше не является.

   **Машинный гейт: `npm run check:encoding`** (`scripts/check-encoding.mjs`), с 2026-07-28
   подключён в `npm run lint`. Проверяет пять вещей: невалидный UTF-8, UTF-8 BOM, UTF-16,
   символ замены `U+FFFD` (уже утраченный текст) и cp1252-мохибаку. Гоняй его **до** того,
   как заявить, что правка чистая — ручной round-trip из пункта 5 нужен только для разбора
   конкретного файла.

   Он существовал и раньше, но не был подключён нигде и потому не запускался: падал на 14
   файлах, чья работа и есть ловить эту порчу (репейрер, его фикстуры, регулярки-детекторы,
   заметки archon). Теперь у них есть явный список исключений внутри скрипта плюс маркер
   `encoding-check: fixture` для новых — исключение действует **только** на правила порчи,
   валидность UTF-8 и запрет BOM обязательны для всех. Грепни маркер, чтобы увидеть все
   исключения.

   Мой round-trip из пункта 5 и этот гейт ловят разное, поэтому нужны оба: `U+FFFD` — это
   валидный UTF-8, round-trip его не видит, а смешанное содержимое round-trip ломает.
   Регулярка гейта `[Ð Ñ]` + верхняя половина — это cp1252-прочтение ведущих байтов
   кириллицы `D0`/`D1`, и она корректна; это НЕ та регулярка `[РС]`, что была удалена выше.

6. **При обнаружении мождибаке** — не пытаться починить алгоритмически через PowerShell или `node -e`. Сразу переписывать файл целиком через `write_to_file` с правильными русскими строками.

### Признаки мождибаке
- `РљР°СЂРёРµСЃ` вместо `Кариес`
- `Р"РЅРµРІРЅРёРє` вместо `Дневник`  
- `2"`, `вЂ"`, `вЂ¦` вместо типографики
- `В«`, `В»` вместо `«`, `»`
- `РЎС‚РѕРјР°С‚РѕР»РѕРіРёСЏ` вместо `Стоматология`

## Структура проекта

- `apps/api/` — Fastify backend (TypeScript)
- `apps/web/` — React frontend (Vite + TypeScript)
- `apps/web/src/components/` — UI компоненты
- `apps/web/src/useAppLogic.tsx` — **настоящий монолит и God Context, 14 557 строк**
  (измерено 2026-07-28). Ограничения на его правку: `.agents/UI_STANDARDS.md` и
  `.agents/INDEX.md` — трогать return-блок без обновления зависимых файлов нельзя.
- `apps/web/src/App.tsx` — главный компонент, **4 876 строк** (измерено 2026-07-28;
  прежняя цифра «~2400» была занижена вдвое и указывала на App.tsx как на монолит,
  тогда как он третий по размеру)
- `apps/web/src/AppHelpers.tsx` — 6 158 строк; `DocumentsView.tsx` — 4 187;
  `components/settings/SettingsImportsTab.tsx` — 4 149 (пересчитано 2026-07-28).
  Здесь третьим стоял `components/settings/SmartImportStudio.tsx` — 4 244. Его в дереве
  больше нет: он удалён вместе с `LegacyMigrationStudio.tsx` (2 623) как несмонтированная
  копия вкладки импорта — ни одного собственного `aria-label` против 48 у смонтированной
  вкладки и 13 обращений `dashboard.` без защитного `?.`. Разбор лежит в
  `apps/web/src/tests/panelsAreMounted.test.ts`, рядом с местом, где стояли их строки долга.
  Любая цифра размера здесь гниёт: пересчитывай (`wc -l`) прежде чем ссылаться на неё, и
  обновляй с датой, как в `INDEX.md`.
- `apps/api/src/db/schema.ts` — Drizzle ORM схема БД
- `apps/api/src/routes/` — API роуты

## Стек

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Fastify, TypeScript, Drizzle ORM, PostgreSQL
- Auth: JWT + staff PIN
- Тесты: Playwright (headless Chromium)

## [STRICT DEVELOPMENT & ANTI-HARDCODE DOCTRINE]

1. **STRICT ANTI-HARDCODE PROTOCOL**:
   Hardcoding config values, ports, database connection details, third-party API keys, environment settings, or magic strings is strictly forbidden. 
   - All parameters must be configurable via `.env` or configurations.
   - Use TypeScript interfaces (`interface`) and dependency decoupling.
   
2. **MANDATORY FULL-FILE COMPREHENSION**:
   Before editing any file, you MUST read it in its entirety to understand the data flow, structure, and imports. Appending unstructured quick-fix patches to the bottom of the file is a critical compliance failure.
   
3. **MONOLITH PREVENTION**:
   Keep code modular. Decompose large structures into reusable parts. Maintain clean architectural patterns.
   
4. **DESIGN ADAPTABILITY MANDATE**:
   All UI modifications must follow structural design requirements:
   - *Multi-Language (i18n)*: Do not hardcode UI text. Extract strings to locale files. Ensure layout blocks (buttons, table headers) have flexible flex/grid wrapping to prevent overlapping for longer words (e.g., Russian translation expansion).
   - *Multi-Theme*: Support Light, Dark, and System theme selections. Utilize Tailwind semantic coloring (such as `dark:` selectors or CSS theme variables); never hardcode specific colors.
   - *Multi-Scale*: Layouts must behave fluidly under different resolutions, high DPI screens, and browser zooming. Use relative metrics (`rem`, `em`, `%`) and responsive breakpoint modifiers.




## [ORCHESTRATION HIERARCHY v2]
1. **Antigravity (Orchestrator L1):** Master console and process launcher. Antigravity sets up daemons and timers. Does not block. Can be closed or idled while daemons run.
2. **Goose / Grok (Agent L2):** Autonomous worker running inside the UniversalDaemonLoop. Goose L2 MUST spawn 3-4 subagents for its own parallel needs (e.g., database schema verification, component audits) and MUST NOT stop or wait for user input. Completion signals are blocked by proxy DAEMON MANDATE.
3. This architecture REPLACES the legacy Cline integrations.
