/**
 * index.ts — Layer 5 Barrel: Unified Exports for Clinical Photo Protocol Module (@dental/shared)
 *
 * Fully compliant with:
 * - ABO (American Board of Orthodontics) standard angles
 * - СтАР клинические рекомендации по ортодонтической диагностике
 * - 18% gray card colorimetric calibration & Before/After split comparison
 */

export * from "./types.js";
export * from "./shotAngleClassifier.js";
export * from "./photoColorCalibration.js";
export * from "./beforeAfterComparator.js";
export * from "./photoPresentationExporter.js";
