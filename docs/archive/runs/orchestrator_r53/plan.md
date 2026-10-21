# Plan — Orchestrator r53

## Mission: Live UI & End-to-End Visual Proof Auditor for Copilot

1. Verify `apps/web/src/components/copilot/useCopilot.ts` and `CopilotDrawer.tsx` connect cleanly to `/api/v1/copilot/`.
2. Ensure backend and frontend dev server or static mock preview is up and run `apps/web/scripts/captureCopilotScreenshots.mjs` or Playwright runner to capture 4 states: PC Light, PC Dark, Mobile Light, Mobile Dark.
3. Verify all screenshots in `docs/proofs/copilot/` and perform multimodal visual audit.
4. Confirm `npm run typecheck -w @dental/web` passes with Exit Code 0.
