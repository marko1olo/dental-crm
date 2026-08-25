# Context & Technical Invariants — Round 28

## Workspace & Boundaries
- Root directory: `C:\Clinic_MVP\dental-crm`
- Monorepo packages:
  * `packages/shared`: Shared clinical models, types, calculators, Order 804n billing rules.
  * `apps/web`: React + Vite frontend, Lucide icons, Vanilla CSS variables / Design Tokens.
  * `apps/api`: Fastify backend, Drizzle ORM, PostgreSQL.

## Architectural Mandates
1. **Zero Mocks / No Stubs**: Every clinical calculation, MPR slice generator, nerve collision detector, telephony handler, and apex locator log must be fully functional and strongly typed.
2. **Vanilla CSS Design Tokens**: Use CSS custom properties (`var(--paper)`, `var(--paper-strong)`, `var(--ink)`, `var(--muted)`, `var(--accent)`, `var(--accent-glow)`, `var(--border)`, `var(--radius)`). Never hardcode raw hex colors in JSX.
3. **Encoding Safety**: Strict UTF-8 without BOM. No Cyrillic mojibake.
4. **WCAG & Contrast**: Strict readability across all 10 themes including high-contrast dark and light modes.
5. **Multi-State Visual Proofs**: PC Dark, PC Light, Mobile Dark, Mobile Light screenshots verified before completion.
