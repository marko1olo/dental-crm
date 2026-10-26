/**
 * ============================================================================
 * DENTAL WARRANTY PRESETS — DOMAIN TYPES & STATUTORY CONDITIONS (Layer 0)
 * Нормативная база гарантийных обязательств СтАР и Закон РФ № 2300-1 (ЗоЗПП).
 * ============================================================================
 */

export type WarrantyCategory =
	| "composite_restoration"
	| "ceramic_crown_veneer"
	| "implant_fixture"
	| "orthodontic_aligners"
	| "removable_prosthesis"
	| "endodontic_treatment"
	| "periodontal_splinting"
	| "temporary_prosthesis";

export interface WarrantyPreset {
	category: WarrantyCategory;
	code: string;
	serviceCode804n: string;
	title: string;
	shortTitle: string;
	description: string;
	statutoryBasis: string;
	baseWarrantyMonths: number;
	minWarrantyMonths: number;
	maxWarrantyMonths: number;
	baseServiceLifeMonths: number;
	minServiceLifeMonths: number;
	maxServiceLifeMonths: number;
	clinicalConditions: string[];
	recommendedMaterials: string[];
	popularManufacturers: string[];
	standardCheckupIntervalMonths: number;
	isManufacturerLifetimeWarranty?: boolean;
}

export interface WarrantyMaintenanceCondition {
	id: string;
	number: number;
	title: string;
	description: string;
	statutoryRef: string;
	isMandatory: boolean;
	penaltyDescription: string;
}

export interface DentalMaterialMeta {
	id: string;
	category: WarrantyCategory;
	name: string;
	manufacturer: string;
	country: string;
	type: string;
	warrantyMonthsDefault: number;
	serviceLifeMonthsDefault: number;
	requiresLotNumber: boolean;
	popularShades?: string[];
}

/**
 * Типы клинических дефектов для 1-клик гарантийной переделки (0 ₽)
 * Мандат 8e: Свобода скидок и переделок врача
 */
export type WarrantyDefectType =
	| "filling_loss" // Выпадение / распломбировка / скол световой пломбы
	| "crown_decementation" // Расцементировка искусственной коронки / мостовидного протеза
	| "ceramic_chip" // Скол керамической облицовки / винира
	| "screw_loosening" // Раскручивание / подвижность винта абатмента имплантата
	| "denture_fracture" // Трещина / перелом базиса съемного протеза
	| "retainer_debonding" // Отклейка ортодонтического ретейнера / брекета
	| "occlusal_discomfort" // Окклюзионный дискомфорт / суперконтакт
	| "custom_defect"; // Индивидуальный клинический дефект

export interface WarrantyRemediationMaterialItem {
	readonly id?: string | undefined;
	readonly name: string;
	readonly quantity: number;
	readonly unit: string;
	readonly lotNumber?: string | undefined;
	readonly sku?: string | undefined;
}

export interface WarrantyDefectTemplate {
	readonly defectType: WarrantyDefectType;
	readonly code: string;
	readonly title: string;
	readonly shortTitle: string;
	readonly category: WarrantyCategory;
	readonly recommendedAction: string;
	readonly clinicalDescription: string;
	readonly defaultMaterials: readonly WarrantyRemediationMaterialItem[];
	readonly statutoryBasis: string;
}

/**
 * 1-Клик нормативные пресеты гарантийных обязательств по СтАР (Мандат 8k & 8e)
 */
export interface StarQuickPreset {
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly category: WarrantyCategory;
	readonly materialName: string;
	readonly manufacturer: string;
	readonly country: string;
	readonly warrantyMonths: number;
	readonly serviceLifeMonths: number;
	readonly serviceCode804n: string;
	readonly statutoryNote: string;
}

export { MANDATORY_WARRANTY_CONDITIONS } from "./warrantyConditionsData.js";
export { VITA_SHADES } from "./vitaShadesData.js";
