/**
 * apps/web/src/components/radiology/CbctStandaloneStudioView.tsx
 *
 * Canonical Thin Facade (Mandate 8b / /decomposer)
 * Full implementation decomposed into modular DAG directory:
 *   - apps/web/src/components/radiology/standaloneStudio/types.ts
 *   - apps/web/src/components/radiology/standaloneStudio/useCbctStandaloneStudio.ts
 *   - apps/web/src/components/radiology/standaloneStudio/StudioTopToolbar.tsx
 *   - apps/web/src/components/radiology/standaloneStudio/StudioViewportGrid.tsx
 *   - apps/web/src/components/radiology/standaloneStudio/StudioSidebarControls.tsx
 *   - apps/web/src/components/radiology/standaloneStudio/index.tsx
 */

export * from "./standaloneStudio/index.js";
export { CbctStandaloneStudioView as default } from "./standaloneStudio/index.js";
