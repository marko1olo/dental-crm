# DISPATCH: Survey Explorer - UI & CSS Tokens

## Objective
Survey Requirement R1:
- Autonomous UI Design System & 4-State Visual Self-Healing.
- WCAG 2.1 AA 4.5:1 contrast compliance across all themes (light, dark, night, etc.).
- Missing/unmapped CSS variables via `node scripts/check-css-tokens.mjs` analysis.
- Broken layout shifts (CLS), forbidden design clichés (neon glowing borders, pulsing animations, purple-on-dark).
- Viewports: Mobile (375px–390px) and Desktop (1440px–1920px).
- Mobile interactive elements touch targets >= 44x44px.

## Scope & Instructions
1. Read `C:\Clinic_MVP\dental-crm\.agents\AGENTS.md`, `C:\Clinic_MVP\dental-crm\ORIGINAL_REQUEST.md`, `C:\Clinic_MVP\dental-crm\.agents\UI_STANDARDS.md`.
2. Inspect the UI codebase in `@dental/web` (and any shared styles in `@dental/shared` or root).
3. Check `scripts/check-css-tokens.mjs` and CSS files for token definitions, dark/light theme consistency, unmapped variables, and contrast issues.
4. Check touch target sizes on mobile interactive components (buttons, tabs, inputs, icon buttons).
5. Recommend a concrete fix strategy and inventory of all files to modify.
6. Write your comprehensive report to `C:\Clinic_MVP\dental-crm\.agents\explorer_survey_ui\handoff.md` and report back.
