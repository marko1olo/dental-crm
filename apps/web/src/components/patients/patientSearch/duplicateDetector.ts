/**
 * duplicateDetector.ts — Layer 2: Фасад выявления дубликатов и неразрушающего слияния пациентов.
 * Мандат 8b: строго <= 15 строк.
 */

export { findPotentialDuplicates } from "./duplicateFinder";
export { mergePatientRecordsNonDestructive } from "./patientMerger";
