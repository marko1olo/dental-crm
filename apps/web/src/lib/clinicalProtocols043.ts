/**
 * apps/web/src/lib/clinicalProtocols043.ts
 *
 * Фасад обратной совместимости (Zero-Downtime Contract).
 * Канонический мастер-модуль клинических протоколов перенесен в:
 * 👉 apps/web/src/lib/clinicalProtocols.ts (Мандаты 8b, 8e, 8x).
 */

export * from "./clinicalProtocols.js";
export {
	type MedicalCardPhysiologicalNormData,
	MEDICAL_CARD_PHYSIOLOGICAL_NORM,
	createMedicalCardPhysiologicalNorm,
	type ClinicalProtocol,
} from "./clinicalProtocols.js";
