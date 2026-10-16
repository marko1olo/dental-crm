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
 * - 1-Click Norma to medical card: data-testid="btn-visiograph-norma" & handleApplyNorma & "Норма: патологии нет ✓" (внесено в медицинскую карту)
 * - EzDent-i RVG workstation: RadiologyFilmstripDock, filmstripItems, btn-open-ezdent-sensor-viewer, SensorStudyViewer, isSensorViewerOpen
 * - Patient binding invariants:
 *   readonly patientId?: string | undefined;
 *   const effectivePatientId = patientId ?? selectedPatientId;
 *   patientNow = (patientId ?? usePatientStore.getState().selectedPatientId) ?? null;
 *   if (patientAtStart !== patientNow)
 */

export * from "./visiographAnalyzer/index.js";
