/**
 * clinicalWriteoffPresets.ts — Стандарты расхода стоматологических материалов.
 */

import type { Kopecks } from "@dental/shared";

export type DentalServiceSpecialty =
	| "therapy"
	| "endodontics"
	| "surgery"
	| "implantology"
	| "hygiene"
	| "orthopedics"
	| "general";

export type MaterialMeasurementUnit =
	| "г"
	| "мл"
	| "шт"
	| "пар"
	| "компл"
	| "фл"
	| "карп"
	| "упак";

export interface ClinicalMaterialDefinition {
	readonly id: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: "composite" | "adhesive" | "endo" | "implant" | "suture" | "anesthesia" | "hygiene" | "ppe" | "disinfection" | "auxiliary" | "surgery";
	readonly unit: MaterialMeasurementUnit;
	readonly okeiCode: string;
	readonly defaultUnitCostKopecks: Kopecks;
	readonly requiresLotTracking: boolean;
	readonly requiresSerialNumber: boolean;
	readonly standardPackagingRu: string;
	readonly descriptionRu?: string | undefined;
}

export interface ServiceMaterialNormItem {
	readonly materialId: string;
	readonly standardQuantity: number;
	readonly isMandatory: boolean;
	readonly defaultDiscrepancyAllowedPercent: number;
	readonly clinicalRationaleRu: string;
}

export interface ProcedureCatalogServiceNorm {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly specialty: DentalServiceSpecialty;
	readonly descriptionRu: string;
	readonly standardDurationMinutes: number;
	readonly materials: readonly ServiceMaterialNormItem[];
}

export type Order804nServiceNorm = ProcedureCatalogServiceNorm;

export interface CabinetStockBatch {
	readonly batchId: string;
	readonly materialId: string;
	readonly cabinetId: string;
	readonly cabinetNameRu: string;
	readonly lotNumber: string;
	readonly serialNumber?: string | undefined;
	readonly expirationDate: string;
	readonly manufactureDate: string;
	readonly quantityAvailable: number;
	readonly criticalThreshold: number;
	readonly unitCostKopecks: Kopecks;
	readonly supplierNameRu: string;
}

export * from "./presets/clinicLegalInfo.js";
export * from "./discrepancies/writeoffDiscrepancies.js";

export * from "./clinicalWriteoffMaterials.js";
export * from "./clinicalWriteoffNorms.js";
export * from "./clinicalWriteoffCabinetStock.js";
