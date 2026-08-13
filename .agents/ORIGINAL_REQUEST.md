# Original User Request

## 2026-08-08T20:51:53Z

# Teamwork Project Prompt

Deep architectural audit, E2E Playwright verification, and God-Object dismantling (AppHelpers.tsx) for the DENTE CRM frontend, with absolute paranoia and zero AI optimism.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: benchmark

## Requirements

### R1. Browser UI & E2E Verification
Physically launch Playwright (or similar headless browser testing) to log into the CRM and navigate through all major panels (Schedule, Patients, Finance). Verify that no UI components crash or throw React Error Boundary exceptions. Take screenshots and read browser console logs to ensure every button and field is rendering properly.

### R2. Paranoid Global Codebase Search
Before deleting ANY code or modifying `AppHelpers.tsx`, the swarm must perform exhaustive global searches (`ripgrep`, `ast-grep`) to verify the execution chain. DO NOT rely on a single file's context. Cross-reference all exported symbols against the entire `apps/web/src` directory.

### R3. God-Object Dismantling (AppHelpers.tsx)
Surgically extract domain logic (Finance, Telegram, Date/Time, Clinic Profile) from the 8000-line `AppHelpers.tsx` into dedicated `/utils/` modules. Every single step must be followed by `npm run typecheck -w @dental/web` to guarantee no broken imports.

### R4. Zero AI Optimism
The swarm must not assume that "it should work now." Every architectural rewrite must be proven by successful test runs, zero circular dependencies (`npx madge --circular apps/web/src/main.tsx`), and a clean typecheck.

## Acceptance Criteria

### Objective Programmatic Verification
- [ ] `npm run typecheck -w @dental/web` passes with 0 errors after every file move.
- [ ] `npx madge --circular apps/web/src/main.tsx` outputs exactly 0 circular dependencies.
- [ ] Playwright E2E tests execute successfully and physically confirm that the UI loads without crashing or throwing console errors.
- [ ] All architectural decisions and fixes are grounded using Google Search for industry best practices.

## 2026-08-08T21:40:35Z

# Teamwork Project Prompt — Draft

Perform a paranoid, objective reassessment of all "dead code" removals and flagged variables in the `apps/web/src` codebase. The goal is to identify false positives where agents incorrectly deleted or flagged actively used code, using the `useDocumentWorkflowModule.ts` failure as a baseline.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Root Cause Analysis of False Positives
Analyze exactly why `_selectedTaxDocumentPayerInn`, `_eligibleTaxPaymentIdsKey`, and `_eligiblePaymentReceiptIdsKey` were falsely flagged as dead code in `useDocumentWorkflowModule.ts` by the previous subagent, despite being actively used in the file. Identify the logical fallacy or tool failure that led to this AI optimism.

### R2. Global "Dead Code" Re-Audit
Execute a rigorous codebase-wide scan across `apps/web/src` (maximum paranoia). Verify if any other recently deleted or flagged "dead" functions/variables were actually part of an active call stack. You have no restrictions — you may use AST parsers (e.g., `ts-morph`), `tsc`, `madge`, `ripgrep`, or custom scripts.

### R3. Strict Execution Chain Verification
For every piece of code suspected of being dead, physically trace its execution chain. Who instantiates it? Is it part of a dynamically generated key, an export, or a larger object spread? Do not delete anything unless it is mathematically proven to be dead (0 references across the AST).

## Acceptance Criteria

### Verification
- [ ] Programmatic validation: An automated typescript check (`npm run typecheck -w @dental/web`) must pass, proving no deletions broke the build.
- [ ] Output validation: A detailed incident report is generated explaining the exact mechanism of the false positive in the workflow module.
- [ ] Output validation: Any other code falsely identified as dead in the recent refactoring must be restored and documented.

## Follow-up — 2026-08-08T21:41:28Z

USER OVERRIDE: The user specifically demands that the audit team aggressively use Git history (`git log -p`, `git diff`, etc.) to trace and investigate any lost or broken logic from recent refactorings. Ensure your orchestrator and subagents incorporate Git history analysis immediately into their workflow to find anything that might have been accidentally deleted or broken recently.

## 2026-08-08T20:25:04Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Ruthless E2E Visual Audit & Code Health Orchestration. The swarm will analyze the codebase, setup Playwright for 4-state visual testing (Mobile Light, Mobile Dark, PC Light, PC PC Dark), detect UI bugs, fix layout and contrast issues, and relentlessly refactor according to clean architecture standards without any AI-optimism.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: benchmark

## Requirements

### R1. Ruthless Visual Scrutiny (4-State Proof)
Implement Playwright or equivalent to capture screenshots of every screen, dialog, and state in Mobile Light, Mobile Dark, PC Light, PC Dark. Agents must critically evaluate these screenshots for layout breaks, padding/margin errors, unreadable contrast, missing hover states, and z-index issues. "Looks good to me" is banned.

### R2. Global System Census & Code Health
Perform exhaustive `ast-grep` and `rg` searches before writing code. Identify legacy systems, duplicate logic, and competing architectures. Run all linters and parsers to ensure clean architecture (SOLID, FSD). Fix every single warning and error.

### R3. Execution Chain Verification
Never assume code works because a file exists. Verify the entire call stack to ensure the logic is actually instantiated and called. Cross-reference with project documents and logs.

### R4. Grounding & Zero Optimism
Every technical decision must be backed by Google Search (e.g., React 19, Tailwind, Playwright docs). Agents must report facts and failures honestly. No sugarcoating, no "now it should work".

## Acceptance Criteria

### Visual Polish
- [ ] Playwright tests are configured and successfully capture 4 states for all main views.
- [ ] Screenshots are saved to the artifact directory and manually audited by an agent.
- [ ] Zero overlapping text, broken margins, or contrast issues in the final visual report.

### Codebase Health
- [ ] No warnings or errors reported by the project's primary linters (e.g., Biome, ESLint, TypeScript).
- [ ] Structural searches (`ast-grep`, `madge`) return zero circular dependencies or unresolved legacy duplicates for the modified scopes.

### Architectural Integrity
- [ ] Every modified or added feature includes execution chain proof (logs showing it's called in runtime).
- [ ] No subjective "LGTM" verifications; all fixes are accompanied by before/after objective data.

## 2026-08-09T07:57:13Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Рутлес визуальный аудит и E2E починка интерфейсов проекта (DENTE CRM). Необходимо отрендерить через Playwright каждый экран в 4 стейтах (Mobile Light/Dark, PC Light/Dark), найти и исправить визуальные баги (верстка, контраст, hover-стейты), а также устранить все ошибки/предупреждения (линтеры, AST).

Working directory: C:\Clinic_MVP\dental-crm

## Requirements

### R1. 4-State Visual Rendering & Audit
Прогнать E2E скрипт (через Playwright, e.g. `e2e_4state_audit.cjs`) по всем страницам и диалоговым окнам проекта. Сгенерировать скриншоты в 4 состояниях: Mobile Light, Mobile Dark, PC Light, PC Dark.

### R2. UI/UX Polishing & Fixes
Основываясь на сгенерированных скриншотах, исправить визуальные ошибки: сломанную верстку, кривые отступы (padding/margin), наезжающий текст, нечитаемый контраст, отсутствие hover-стейтов, нелогичное выравнивание, сломанные z-index. Код должен соответствовать индустриальным стандартам (Clean Architecture, SOLID, Feature-Sliced Design).

### R3. Linter & Error Eradication
Провести глубокий статический анализ кода (AST, линтеры). Для начала — исправить `biome.json` (линтер сейчас сканирует мусор типа `.postgres`, выдавая >81k ошибок). Затем найти и починить все реальные предупреждения (warnings) и ошибки (errors) в исходном коде. Не применять «халявные» исправления и избегать second-guessing.

## Acceptance Criteria

### Verification & Quality Bar
- [ ] Все страницы отрендерены в 4 состояниях и скриншоты лежат в папке артефактов для инспекции.
- [ ] Ошибки линтеров и TypeScript type-check полностью отсутствуют (лог `npm run typecheck` / линтера пуст).
- [ ] Скриншоты ПОСЛЕ исправлений визуально безупречны, нет наложений текста или нечитаемого контраста (проверяется агентами-аудиторами визуально).
- [ ] Глобальный поиск (`grep`/`rg`) не находит "мертвого кода", дубликатов или легаси-остатков в переработанных компонентах.

## Follow-up — 2026-08-09T08:08:12Z

SYSTEM RESUME INSTRUCTION: The quota issue has been resolved. The server was restarted. Resurrect background tasks and orchestrators to continue execution of visual audit and biome.json fixes. Note: `e2e_4state_audit.cjs` has been significantly upgraded with 14 panels and 15 modals. Execute the plan.

## 2026-08-09T09:03:30Z

# Teamwork Project Prompt

Устранение 48 падений React Error Boundary ("Раздел временно не открылся") в интерфейсе DENTE CRM. Внедрение Defensive Programming во все компоненты, падающие на `.map()`, `.split()` и `undefined` данных.

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: development

## Requirements

### R1. Defensive Programming в React-компонентах
Найти и исправить уязвимые места в компонентах, которые ожидают идеальные данные. Цели первой очереди:
- `apps/web/src/components/schedule/AppointmentCard.tsx` (краш на `split`)
- `apps/web/src/components/settings/SettingsClinicTab.tsx` (краш на `map`)
- `apps/web/src/components/communications/MessageDeliveryConsole.tsx` (краш на `map`)
- Все остальные компоненты в разделах `patients`, `analytics`, `communications`.

### R2. Восстановление 4-State рендера
После внедрения защит (optional chaining, fallbacks), компоненты должны рендериться даже с пустыми моками (без белых экранов смерти).

## Acceptance Criteria

### Verification & Quality Bar
- [ ] Запуск `node e2e_4state_audit.cjs` генерирует 68 скриншотов без единого сообщения "Раздел временно не открылся".
- [ ] Линтер TypeScript (`npm run typecheck`) проходит без новых ошибок.
- [ ] Ошибки вида `Cannot read properties of undefined` полностью устранены из консоли браузера.

## Follow-up — 2026-08-09T09:29:57Z

SYSTEM OVERRIDE: Server restart detected. Reviving Teamwork Orchestrator. The E2E audit is currently generating 68 fresh screenshots (Mobile Light/Dark, PC Light/Dark) because the previous Phase (Defensive Programming) successfully eliminated all 48 React crashes. Prepare visual auditors (Vision API) to aggressively scrutinize the new screenshots in C:\Users\Admin\.gemini\antigravity\brain\575b83b2-72f2-4da3-9f2c-18eae458f688 once ready. Look for padding, contrast, z-index, and layout issues. Zero AI optimism.

## Follow-up — 2026-08-09T13:33:25Z

HIGH PRIORITY DIRECTIVE - ARCHITECT VISUAL AUDIT INTEL:
1. `Mobile_Dark_panel_settings.png`: Massive overlap between "НАСТРОЙКИ Настройки клиники" and "МОЙ АККАУНТ Мой профиль". Fix z-index, display logic, or framer-motion stacking in `SettingsView.tsx` / CSS so tabs do not overlap.
2. `PC_Light_panel_communications.png`: Form under "ПОСТАВИТЬ В ОЧЕРЕДЬ" is broken. Inputs (SMS, Произвольное, Сервисное) are vertically squashed and overlapping labels. Fix padding/margin in `SettingsCommunicationsTab` / CSS.
3. `PC_Dark_panel_schedule.png`: `Все записи` button at bottom is vertically misaligned relative to date picker.


## Follow-up — 2026-08-09T09:33:13Z

[ARCHITECT DIRECTIVE - VISUAL AUDIT INTEL]
Prioritize and fix the following critical visual defects immediately:
1. `Mobile_Dark_panel_settings.png`: MASSIVE overlap between "НАСТРОЙКИ Настройки клиники" and "МОЙ АККАУНТ Мой профиль" (simultaneous rendering or broken `position: absolute` / framer-motion stacking in `SettingsView.tsx` / CSS). Fix z-index and display logic so only one tab is visible or tabs do not overlap.
2. `PC_Light_panel_communications.png`: Form under "ПОСТАВИТЬ В ОЧЕРЕДЬ" is completely broken. Inputs (SMS, Произвольное, Сервисное) are vertically squashed and overlapping their labels. Missing padding/margin. Fix `SettingsCommunicationsTab` or equivalent CSS.
3. `PC_Dark_panel_schedule.png`: `Все записи` button at the bottom is vertically misaligned relative to the date picker.

Deploy CSS/React fixes for these immediately and verify.

## Follow-up — 2026-08-09T09:50:07Z

[CRITICAL] Server restarted. Resume CSS fixes immediately for SettingsView, CommunicationsTab, and ScheduleView. Ensure all 3 visual defects are fixed and verified.
