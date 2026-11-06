/**
 * DENTE Dental CRM — Endodontics Canonical SSOT Module Index
 * apps/web/src/components/endo/index.ts
 */

export * from "./endodonticsCatalogData";
export * from "./EndodonticStudioModal";
export { default as EndodonticStudioModal } from "./EndodonticStudioModal";
export * from "./DirectEndodonticsLauncher";
export { default as DirectEndodonticsLauncher } from "./DirectEndodonticsLauncher";

// Backward Compatibility Aliases & Facades
export { EndodonticStudioModal as EndoCanalLogModal } from "./EndodonticStudioModal";
export * from "./ChairsideEndoQuickBar";
export { default as ChairsideEndoQuickBar } from "./ChairsideEndoQuickBar";
