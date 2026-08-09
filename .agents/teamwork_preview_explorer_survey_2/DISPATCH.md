# DISPATCH — Survey Explorer 2 (UI/UX Architecture & 4-State Themes)

## 2026-08-09T11:58:00Z

## Mission
Perform codebase survey of UI/UX components, panel views, dialogs, and Light/Dark theme mechanisms across `apps/web/src`.

## Scope & Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\ORIGINAL_REQUEST.md`.
2. Inspect `apps/web/src/components` and main views (`#schedule`, `#patients`, `#finance`, settings, medical cards, document workflows, appointment modals, etc.).
3. Identify all key views and modal dialog windows that must be captured in the 4-state visual audit (Mobile Light, Mobile Dark, PC Light, PC Dark).
4. Analyze how Light and Dark modes are toggled (e.g. `dark` class on `html`/`body`, CSS variables, data attributes) and how mobile viewport breakpoints are styled in Tailwind CSS v4.
5. Save your investigation report and findings to `C:\Clinic_MVP\dental-crm\.agents\teamwork_preview_explorer_survey_2\handoff.md`.
