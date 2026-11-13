/**
 * packages/shared/src/clinical/bundles/bundleTypes.ts
 * Canonical Diagnosis-to-Services Types & Interfaces (Mandates 8b, 8e, 8k, 8n, 8x, 8ap).
 * Strict integer kopecks without float drift; pure domain naming with backward-compatible aliases.
 */

export interface CanonicalDiagnosisService {
	readonly id: string;
	readonly serviceCode: string;
	readonly nomenclatureCode: string;
	readonly code804n: string; // Backward-compatible alias per Mandate 8ap
	readonly title: string;
	readonly defaultPriceKopecks: number;
	readonly defaultPriceRub: number;
	readonly requiredByDefault: boolean;
	readonly category: string;
}

export function createCanonicalService(params: {
	id: string; serviceCode: string; title: string; defaultPriceKopecks: number;
	defaultPriceRub: number; requiredByDefault: boolean; category: string;
	nomenclatureCode?: string; code804n?: string;
}): CanonicalDiagnosisService {
	const code = params.serviceCode || params.code804n || "";
	return {
		id: params.id, serviceCode: code, nomenclatureCode: params.nomenclatureCode ?? code,
		code804n: params.code804n ?? code, title: params.title, defaultPriceKopecks: params.defaultPriceKopecks,
		defaultPriceRub: params.defaultPriceRub, requiredByDefault: params.requiredByDefault, category: params.category,
	};
}

export interface CanonicalDiagnosisBundle {
	readonly id: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitle: string;
	readonly toothState: string;
	readonly title: string;
	readonly shortLabel: string;
	readonly badge: string;
	readonly defaultTotalPriceKopecks: number;
	readonly defaultTotalPriceRub: number;
	readonly services: readonly CanonicalDiagnosisService[];
}

export interface CustomizedBundleItem {
	readonly serviceId: string;
	readonly serviceCode: string;
	readonly nomenclatureCode?: string | undefined;
	readonly code804n: string; // Backward-compatible alias
	readonly title: string;
	readonly priceKopecks: number;
	readonly priceRub: number;
	readonly priceId: string | null;
	readonly requiredByDefault: boolean;
	readonly checked: boolean;
	readonly category: string;
	readonly toothCode: string | null;
}

export interface CustomizedBundleResult {
	readonly bundleId: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitle: string;
	readonly items: readonly CustomizedBundleItem[];
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly checkedCount: number;
}

export interface Cashier54FzItemPayload {
	readonly name: string;
	readonly serviceCode?: string | undefined;
	readonly code804n: string;
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly sumKopecks: number;
	readonly taxRate: "none" | "vat20" | "vat10";
	readonly paymentSubject: 4; // Услуга по кассовому стандарту
	readonly paymentMethod: 4; // Полный расчет
	readonly toothNumber?: number | undefined;
	readonly toothCode?: string | undefined;
}

export interface Cashier54FzBundleExport {
	readonly source: "chairside_diagnosis_package";
	readonly bundleId: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitle: string;
	readonly toothCode?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly itemsCount: number;
	readonly receiptItems: readonly Cashier54FzItemPayload[];
}

export interface ToothClinicalServicePayload {
	readonly serviceId?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly code804n?: string | undefined;
	readonly code?: string | undefined;
	readonly toothNumber?: number | string | undefined;
	readonly toothCode?: string | undefined;
	readonly name?: string | undefined;
	readonly title?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly price?: number | undefined;
	readonly priceKopecks?: number | undefined;
	readonly amountKopecks?: number | undefined;
	readonly discountRub?: number | undefined;
	readonly discountPercent?: number | undefined;
	readonly quantity?: number | undefined;
	readonly category?: string | undefined;
	readonly labCostRub?: number | undefined;
	readonly labCostKopecks?: number | undefined;
}

export type ClinicalBundleId =
	| "caries_turnkey"
	| "endo_1canal_turnkey"
	| "endo_3canal_turnkey"
	| "hygiene_turnkey"
	| "extraction_turnkey"
	| "complex_extraction"
	| "implant_turnkey"
	| "crown_metalloceramic_turnkey"
	| "crown_zirconia_turnkey"
	| "impression_asilicone_2jaws"
	| (string & {});

export type ClinicalBundleCategory =
	| "therapy"
	| "surgery"
	| "hygiene"
	| "orthopedics"
	| "implantation"
	| "periodontics"
	| "prevention"
	| (string & {});

export interface ClinicalBundleItemTemplate {
	readonly id: string;
	readonly serviceCode: string;
	readonly code804n?: string | undefined;
	readonly name: string;
	readonly category: string;
	readonly defaultPriceRub: number;
	readonly defaultPriceKopecks: number;
	readonly priceRub?: number | undefined;
	readonly unitPriceRub?: number | undefined;
	readonly toothNumber?: number | undefined;
	readonly materials: string;
	readonly clinicalRationale: string;
	readonly optional?: boolean | undefined;
	readonly defaultSelected?: boolean | undefined;
	readonly hideInPatientPresentation?: boolean | undefined;
}

export interface ClinicalBundleDefinition {
	readonly id: ClinicalBundleId;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: ClinicalBundleCategory;
	readonly categoryLabel: string;
	readonly categoryName?: string | undefined;
	readonly stageKind: string;
	readonly stageNumber: number;
	readonly totalPriceRub: number;
	readonly totalPriceKopecks: number;
	readonly basePriceRub: number;
	readonly basePriceKopecks: number;
	readonly totalRub?: number | undefined;
	readonly totalKopecks?: number | undefined;
	readonly estimatedVisits?: number | undefined;
	readonly requiresTooth: boolean;
	readonly defaultTooth: number;
	readonly badgeColor: string;
	readonly items: readonly ClinicalBundleItemTemplate[];
}
