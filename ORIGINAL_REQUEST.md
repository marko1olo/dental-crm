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



