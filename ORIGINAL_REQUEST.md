# Original User Request

## 2026-07-27T00:09:13Z

Execute a comprehensive UI unification and cohesion overhaul across all 11 modules of DENTE Dental CRM (`C:\Clinic_MVP\dental-crm`).

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: `development`

## Requirements

### R1. Cohesive UI Design System Unification
Unify all visual elements across all 11 views (Shift, Schedule, Patients, Imaging, Visit, Documents, Finance, Analytics, Communications, Settings, Marketing):
- Standardize card border-radii (`14px`), container paddings, typography scales (`Golos Text`), and elevation shadow depths.
- Harmonize button variants (Primary teal gradient, Secondary soft border, Ghost text) and status badges (`status-pill`) across all views.
- Ensure 100% theme consistency across Light, Dark, and Night modes without raw color mismatches.

### R2. Structural Inline Style Cleanup & Responsive Refactoring
Audit and refactor all view components to replace ad-hoc inline styles with unified CSS classes from `dente-redesign.css` and `main.css`. Ensure clean responsive flex/grid layouts without horizontal scrolling or text clipping on mobile (390px) and desktop (1440px).

### R3. Quality & Verification Gates
- Verify zero TypeScript errors (`npm run typecheck`).
- Execute `dente-redesign-shots.mjs` to capture 4-state visual proof (Desktop/Mobile x Light/Dark).
- Commit every modified file individually per Clinic MVP Constitution.

## Acceptance Criteria

### Verification
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] All 11 views demonstrate a cohesive, unified visual language.
- [ ] 4-state visual proof matrix generated and self-audited.

## 2026-07-31T12:21:20Z

Full clinical and UI mounting sprint for Dental CRM (`C:\Clinic_MVP\dental-crm`) to bridge backend API capabilities with React web UI views, seed realistic clinical data, and verify visual quality across 4 layout/theme states.

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: development

## Requirements

### R1. UI Feature Mounting & Workflow Integration
Integrate unmounted backend query modules and Fastify routes into the React web client (`apps/web/src/`):
- Mount "Потерянные пациенты" (Lost Patients Filter from `lostPatientsFiltersQuery.ts`) in `AnalyticsDashboardView.tsx` and `PatientsView.tsx`.
- Mount No-Show Risk Indicator (`patientNoShowRiskQuery.ts`) badges on appointment cards in `ScheduleView.tsx`.
- Ensure zero broken/unmounted routes or dead-end buttons.

### R2. Clinical Seed Expansion & Realistic Demo Data
Expand base seed dataset in `apps/api/.data/dental-crm-state.json` and `seedOpsScreenshotDemo.ts`:
- Include at least 15 patients with full administrative profiles (Passport, SNILS, OMS/DMS).
- Seed completed EMK visits with objective findings and tooth formula statuses (teeth 11–48 crowns, fillings, missing teeth).
- Seed completed works acts, 54-FZ fiscal receipts, NDFL certificates (КНД 1151156 XML), and EGISZ CDA XML snapshots.

### R3. Automated Visual Proof & 4-State Verification
Verify UI quality and theme responsiveness using Playwright/CDP screenshot tools (`scripts/ops-panels-shots.mjs`):
- Fix session token re-hydration during theme changes to prevent shift lock screen fallbacks.
- Capture 4-state visual proof (PC Light, PC Dark, Mobile Light, Mobile Dark) without any `_ПУСТО.png` diagnostic screens.

### R4. Compilation, Encoding & Code Quality Gates
Enforce strict repository quality gates prior to commit:
- `npm run check:encoding` must pass with 0 encoding/mojibake errors.
- `npm run typecheck` must pass with 0 TypeScript compiler errors across all monorepo packages (`@dental/shared`, `@dental/api`, `@dental/web`).

## Acceptance Criteria

### Quality & Build Invariants
- [ ] `npm run check:encoding` passes with 0 errors across all codebase files.
- [ ] `npm run typecheck` passes cleanly with 0 TypeScript errors across `@dental/shared`, `@dental/api`, and `@dental/web`.
- [ ] `node scripts/ops-panels-shots.mjs` generates complete, non-empty screenshot panels without falling back to shift lock screens or diagnostic `_ПУСТО.png` placeholders.
- [ ] All 4 layout/theme states (PC Light, PC Dark, Mobile Light, Mobile Dark) are verified with clean visual rendering.
- [ ] All changes are committed to git with proper conventional commit messages and zero tool attributions.

## 2026-07-31T22:19:51Z

DENTE Dental CRM is a high-performance clinical management platform for dentistry. Your agent swarm will autonomously audit database integrity, complete Form 043/у visual styling, enforce kopeck-exact financial accounting, and verify 4-state UI responsiveness (Mobile Light, Mobile Dark, PC Light, PC Dark).

Working directory: C:\Clinic_MVP\dental-crm
Integrity mode: demo

## Requirements

### R1. Form 043/у & Odontogram Completeness
The clinical diary (Form 043/у) and interactive tooth map (Odontogram) must render correctly without layout shifts, clipped text, or missing patient data.

### R2. Kopeck-Exact Financial & Tenant Isolation
All transaction calculations, pricing, and patient balance ledgers must execute with kopeck-exact integer arithmetic (1 RUB = 100 kopecks), strict tenant isolation, and zero floating-point rounding errors.

### R3. 4-State Visual Verification & Automated Playwright Proof
Every primary UI route (Visit, Schedule, Patients, Finance, Settings) must pass automated 4-state visual testing: Mobile Light (390x844), Mobile Dark (390x844), PC Light (1440x900), and PC Dark (1440x900).

## Acceptance Criteria

### Clinical & UI Integrity
- Form 043/у renders with complete patient anamnesis, treatment history, and active odontogram state.
- Zero mojibake encoding corruption across all Russian Cyrillic strings in UI and API responses.
- All 4 visual states (Mobile Light/Dark, PC Light/Dark) generate crisp, non-overlapping screenshots.

### Database & Security Safety
- PostgreSQL 18.4 migrations execute cleanly (0 failed migrations).
- All database queries enforce strict tenant/organization isolation (organization_id filter).
- Zero hardcoded secrets, CSRF tokens, or plain-text credentials in source or committed files.

## 2026-08-07T23:06:48Z

# Teamwork Project Prompt - Draft

> Status: Step 1 - Eliciting project idea
> Goal: Craft prompt -> get user approval -> delegate to teamwork_preview

Deep functional audit and architectural hardening of the DENTE CRM codebase (React/TypeScript/PostgreSQL), fixing runtime bugs, linter errors, and circular dependencies with strict adherence to existing system rules.

Working directory: `C:\Clinic_MVP\dental-crm`

## Extreme Directives & Operating Constraints

### T.A.R.S. Mode: Absolute Pragmatism
You are operating in a highly critical, zero-tolerance environment. Do NOT exhibit "AI-optimism". Do NOT assume a fix works just because the syntax looks correct. Do NOT use phrases like "this should fix the issue" or "now it is working". You are forbidden from second-guessing architectural rules. If you find garbage, you do not gloss over it - you document it, isolate the root cause, and purge it according to the highest industrial standards.

### The "Dead Code" Trap & Execution Chain Verification
Never assume an algorithm or function is active just because it exists in a file. Before you modify a piece of logic, you must manually verify its call stack. Who instantiates it? Who calls `Execute()`? Is it an orphaned component? You must use tools like `ast-grep` and `rg` to perform a multi-vectored, global codebase census. If the system manifest implies a feature should exist but you cannot find it immediately, SOUND THE ALARM and dig deeper. 

## Industrial Standards & Best Practices

To ensure all fixes align with the highest tiers of software engineering, you must strictly adhere to the following principles during your audit:

1. **React State & Render Lifecycle**:
   - **No Stale Closures**: When resolving async functions inside `useEffect` or event handlers, ensure state updates rely on functional updaters (`setState(prev => ...)`).
   - **AbortControllers**: For any newly implemented or refactored network requests (`fetch`), you must ensure an `AbortController` is attached and triggered upon component unmount to prevent memory leaks and "setState on unmounted component" memory warnings.
   - **Idempotency in UI States**: Repeatedly clicking a submit button should not result in multiple network requests. The `isLoading` state must be set synchronously before the async execution context yields.

2. **Network & Error Handling**:
   - **Granular Error Parsing**: Do not just show "An error occurred". Parse the HTTP status code. If it's a 403, notify the user of expired access. If it's a 400, show validation errors. If it's 500, indicate a server failure. 
   - **Graceful Degradation**: If an async operation fails, the UI must revert cleanly to its previous state without leaving the user trapped in an infinite loading spinner.

3. **Accessibility & Layout (A11y & CLS)**:
   - **Cumulative Layout Shift (CLS)**: When injecting spinners or disabling buttons, ensure the button's dimensions are fixed or min-width is set so the UI does not violently jump.
   - **ARIA Attributes**: Always use `aria-busy={true}` alongside `disabled={true}` for accessibility tools to recognize the loading state.

## Deep Architectural Requirements

### R1. Eradication of "Silent Swallows" and Unhandled Async Errors
The current system suffers from critical functional defects where asynchronous operations (API fetches, tRPC calls, document generation) fail silently. When a promise rejects or a `try/catch` block catches an error, it is currently being swallowed (e.g., `catch (e) { console.error(e) }`) without any user-facing feedback. 
Your task is to hunt down every single instance of unhandled or poorly handled async errors across the entire React frontend (`apps/web/src`). 
For every discovered instance, you must explicitly route the error to the UI using the project's established toast infrastructure (`showToast`, `actionFailureToast`). The medical staff (dentists, administrators) must receive clear, localized, and actionable feedback when a network request fails, rather than staring at a frozen screen while the console silently bleeds errors.

### R2. Annihilation of Race Conditions and Double Submits (State Hardening)
Critical user flows-specifically financial transactions (Sberbank terminal integrations), appointment bookings, and document signing-are vulnerable to double-submit race conditions. Forms and action buttons are currently failing to lock their UI state during pending asynchronous operations. 
You must identify all buttons and forms that trigger mutations or API requests and ensure they are fortified with strict loading states. You must implement robust `isSubmitting`, `isLoading`, or `isPending` state guards. Buttons must be physically disabled (`disabled={isSubmitting}`) and visually indicate their loading state (`aria-busy={true}`) to prevent users from spam-clicking and corrupting the PostgreSQL database with duplicate records. 

### R3. Exhaustive Discovery and Code Health Enforcement
Your reconnaissance must be paranoid and exhaustive. Before applying any fixes to the functional bugs mentioned in R1 and R2, you must execute a structural search of the codebase. You are required to run `rg "await fetch|catch" apps/web/src` and `rg "onSubmit" apps/web/src` to map the battlefield. 
Furthermore, you are strictly bound by the project's linter and compiler rules. Every piece of code you touch must comply with the existing Biome rules and TypeScript strict mode configurations. You must never bypass a type check with `any` or `@ts-ignore`. 

## Acceptance Criteria

### Technical Correctness (Objective Verification)
- [ ] **Type Safety:** The entire workspace must compile cleanly. You must run `npm run typecheck -w @dental/web` and `npm run typecheck -w @dental/api`. The exit code MUST be `0`.
- [ ] **Linter Compliance:** You must run `npx biome lint apps/web/src`. The command must return zero errors for all files modified during your operation.
- [ ] **Proof of Execution:** You must not claim a task is complete without providing the actual terminal `stdout` logs demonstrating that the compiler and linter passed.

### Functional Integrity
- [ ] Every modified action button or form submit handler actively blocks secondary interactions while the initial promise is resolving.
- [ ] Every modified `catch` block explicitly informs the user of the failure state via `showToast` or an equivalent established UI pattern.
- [ ] No regression of existing functionality: Context providers, custom hooks, and memoization dependencies must remain intact and functionally identical in their positive paths.

## 2026-08-08T09:59:45Z

# Teamwork Project Prompt — Draft

> Status: Launched

Deep architectural restoration of the DENTE CRM codebase (`apps/web`). Over the last 7-10 days, rogue agents went on a destructive refactoring spree, deleting 198 critical properties and their underlying logic from the `useAppLogic` state monolith. 
The team must manually reconstruct this lost logic by extracting the implementations from the **Golden Reference Commit from July 30th (`da92ab9507`)** and surgically injecting them into the modern codebase, **WITHOUT LOSING ANY MODERN CHANGES (bugfixes, tests, UI changes) made in the last 7 days**.

Working directory: `C:\Clinic_MVP\dental-crm`
Integrity mode: development (no restrictions)

## Requirements

### R1. Intelligent Logic Restoration (No Purging)
The swarm must NOT use AST scripts to delete UI components or buttons. You must read `dead_props.txt` to identify the 198 missing properties (e.g. `previewMigrationAutopilotSources`, `telegramStaffEscalationChannelDraft`). 
You must run `git show da92ab9507:apps/web/src/useAppLogic.tsx` (the stable version before the massacre) to find the original implementations of these 198 properties. You must manually extract that logic and integrate it into the current domain hooks (`apps/web/src/hooks/domains/`) and the current `useAppLogic.tsx`.

### R2. Surgical Merging (PRESERVE ALL MODERN CHANGES)
**CRITICAL:** You cannot simply `git checkout` or overwrite the old files. Doing so will destroy all the valid bugfixes and optimizations made in the last week. 
You must **surgically copy** the missing functions and state variables from the golden commit (`da92ab9507`) and **paste them** into the modern architecture. Modern changes must be preserved at all costs.

### R3. Global Execution Chain Integrity
When restoring functions, ensure they are actually wired correctly to the backend or local state. Do not just return dummy empty functions `() => {}` unless absolutely necessary to unblock the build as a temporary fallback. 

## Acceptance Criteria

### Technical Correctness
- [ ] `npm run typecheck -w @dental/web` must exit with `0`. The 198 `TS2339` errors must be completely resolved by providing the correct types and implementations in `useAppLogic`.
- [ ] No existing UI buttons or views are deleted or commented out.
- [ ] No bugfixes, structural changes, or accessibility fixes made between July 30 and August 8 are overwritten or lost.

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



