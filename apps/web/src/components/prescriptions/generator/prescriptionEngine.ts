/**
 * prescriptionEngine.ts — Statutory Prescription & Latin Rx Engine Facade
 * DENTE Dental CRM (Mandates 8e, 8n, 8x, 8y & Mandate 8b <= 120 lines).
 */

import { calculatePrescriptionExpiration } from "@dental/shared";

export { calculatePrescriptionExpiration };
export * from "./prescriptionEngineTypes";
export * from "./prescriptionDocumentGenerator";
export * from "./prescriptionMemoFormatter";
export * from "./prescriptionMnnCatalog";
export * from "./prescriptionEngineNormalizer";
export * from "./prescriptionDosageEngine";
