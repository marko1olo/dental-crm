/**
 * @file VisiographAnalyzer.tsx
 * Canonical Thin Facade (Mandate 8b & Wave 23 Decomposer)
 * 
 * Re-exports VisiographAnalyzer master component and types from ./visiographAnalyzer.
 * 
 * Clinical Invariants & Contract Specifications:
 * - Writes to live tooth chart: /tooth-states/batch with denteClinicalMutationHeaders({ "Content-Type": "application/json" })
 * - Zero-delay local scan load: reader.readAsDataURL(file) -> setCurrentImageUrl(dataUrl) (<50ms)
 * - AI analysis button: data-testid="btn-run-visiograph-ai" & handleRunAiAnalysis
 * - Chart confirmation button: data-testid="btn-apply-findings-to-chart"
 * - 1-Click Norma to 043/u: data-testid="btn-visiograph-norma-043" & handleApplyNormaTo043
 * - EzDent-i RVG workstation: RadiologyFilmstripDock, filmstripItems, btn-open-ezdent-sensor-viewer, SensorStudyViewer, isSensorViewerOpen
 */

export * from "./visiographAnalyzer/index.js";
