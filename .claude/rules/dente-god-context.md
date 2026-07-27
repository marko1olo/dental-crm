---
paths:
  - "apps/web/src/useAppLogic.tsx"
---

# God Context — surgical edits only

Canonical law is `.agents/AGENTS.md`. This rule routes; it does not override.

`useAppLogic.tsx` is 14,423 lines (counted 2026-07-27) and exposes one massive context object consumed
across the UI. Changing its return block or deleting an exported field breaks the typecheck of 50+ files
immediately.

- Read the region you are touching before editing. No appending quick-fix patches to the bottom.
- Do not remove or rename fields on the returned object without updating every consumer in the same
  change. Grep the field name across `apps/web/src` first.
- Additive changes are cheap; signature and shape changes are not. Prefer adding over reshaping.
- Run `npm run typecheck` after any edit here and treat every error as blocking. "It compiles" is still
  not "it works" — prove behaviour with observed output.
- Neighbouring agents work in this folder concurrently. Stage only the exact files you edited; never
  `git add .`.
