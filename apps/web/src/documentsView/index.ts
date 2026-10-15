/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOCUMENTS VIEW BARREL (apps/web/src/documentsView/index.ts)
 * Architecture: Acyclic Re-Export Barrel for Decomposed DocumentsView
 * Compliance: Mandate 8b | Zero Circular Dependencies
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "./types";
export { DocumentsToolbar } from "./DocumentsToolbar";
export { DocumentsTemplateGrid } from "./DocumentsTemplateGrid";
export { DocumentsRecentList } from "./DocumentsRecentList";
export { DocumentsA4PrintPreview } from "./DocumentsA4PrintPreview";
export { useDocumentsViewController } from "./useDocumentsViewController";
