/**
 * ============================================================================
 * CLINICAL WRITEOFF PRESETS & ORDER 804N DENTAL SERVICE NORMS
 * Стандарты расхода стоматологических материалов, привязанные к номенклатуре
 * медицинских услуг Минздрава РФ (Приказ № 804н), справочник складских партий
 * и типовые нормы списания в кабинете/кресле врача-стоматолога.
 * ============================================================================
 */

import { type Kopecks, parseKopecks } from "@dental/shared";

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

export type DiscrepancyReasonCode =
	| "standard_consumption"
	| "additional_carpule"
	| "anatomical_complexity"
	| "broken_instrument"
	| "sterile_packaging_breach"
	| "spillage_loss"
	| "sample_testing"
	| "expired_quarantine"
	| "defect_broken";

export interface DiscrepancyReasonDefinition {
	readonly code: DiscrepancyReasonCode;
	readonly labelRu: string;
	readonly descriptionRu: string;
	readonly isDefect: boolean;
}

export interface ClinicalMaterialDefinition {
	readonly id: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: "composite" | "adhesive" | "endo" | "implant" | "suture" | "anesthesia" | "hygiene" | "ppe" | "disinfection" | "auxiliary" | "surgery";
	readonly unit: MaterialMeasurementUnit;
	readonly okeiCode: string; // ОКЕИ: 166-г, 111-мл, 796-шт, 715-пара, 839-компл
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
	readonly defaultDiscrepancyAllowedPercent: number; // допустимое отклонение в %
	readonly clinicalRationaleRu: string;
}

export interface Order804nServiceNorm {
	readonly serviceCode: string;
	readonly serviceTitle: string;
	readonly specialty: DentalServiceSpecialty;
	readonly descriptionRu: string;
	readonly standardDurationMinutes: number;
	readonly materials: readonly ServiceMaterialNormItem[];
}

export interface CabinetStockBatch {
	readonly batchId: string;
	readonly materialId: string;
	readonly cabinetId: string;
	readonly cabinetNameRu: string;
	readonly lotNumber: string;
	readonly serialNumber?: string | undefined;
	readonly expirationDate: string; // ISO YYYY-MM-DD
	readonly manufactureDate: string;
	readonly quantityAvailable: number;
	readonly criticalThreshold: number;
	readonly unitCostKopecks: Kopecks;
	readonly supplierNameRu: string;
}

export interface ClinicLegalInfo {
	readonly clinicNameRu: string;
	readonly okpoCode: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly kpp: string;
	readonly addressRu: string;
	readonly chiefDoctorFullName: string;
	readonly chiefDoctorPosition: string;
	readonly headNurseFullName: string;
	readonly headNursePosition: string;
}

/**
 * 1. Юридические реквизиты клиники по умолчанию
 */
export const DEFAULT_CLINIC_LEGAL_INFO: ClinicLegalInfo = {
	clinicNameRu: "ООО «Стоматологическая клиника ДЕНТЕ»",
	okpoCode: "49201948",
	ogrn: "1187746123456",
	inn: "7704456789",
	kpp: "770401001",
	addressRu: "г. Москва, ул. Тверская, д. 24, стр. 1",
	chiefDoctorFullName: "Кузнецов Михаил Сергеевич",
	chiefDoctorPosition: "Главный врач",
	headNurseFullName: "Смирнова Анна Викторовна",
	headNursePosition: "Главная медицинская сестра",
};

/**
 * 2. Эталонные причины расхождений и отклонений от технологических норм
 */
export const DISCREPANCY_REASONS: readonly DiscrepancyReasonDefinition[] = [
	{
		code: "standard_consumption",
		labelRu: "Стандартный клинический расход",
		descriptionRu: "Списание точно по норме технологической карты услуги",
		isDefect: false,
	},
	{
		code: "additional_carpule",
		labelRu: "Дополнительная анестезия (чувствительность)",
		descriptionRu: "Повторная карпула анестетика из-за высокого болевого порога пациента",
		isDefect: false,
	},
	{
		code: "anatomical_complexity",
		labelRu: "Сложная анатомия / глубокий дефект",
		descriptionRu: "Увеличенный расход композита/силера при некариозных или атипичных полостях",
		isDefect: false,
	},
	{
		code: "broken_instrument",
		labelRu: "Поломка бора / эндодонтического файла",
		descriptionRu: "Абразивный износ или поломка вращающегося инструмента в процессе лечения",
		isDefect: true,
	},
	{
		code: "sterile_packaging_breach",
		labelRu: "Нарушение стерильности упаковки",
		descriptionRu: "Случайное касание нестерильной зоны до внесения в полость рта",
		isDefect: true,
	},
	{
		code: "spillage_loss",
		labelRu: "Случайная потеря / разлив материала",
		descriptionRu: "Технический разлив или перерасход жидкости при замешивании",
		isDefect: true,
	},
	{
		code: "sample_testing",
		labelRu: "Входной контроль / калибровка дозатора",
		descriptionRu: "Технологическое списание капли материала для проверки отверждения",
		isDefect: false,
	},
	{
		code: "expired_quarantine",
		labelRu: "Истекший срок годности (карантин/ТОРГ-16)",
		descriptionRu: "Партия с истекшим сроком годности направлена на утилизацию",
		isDefect: true,
	},
	{
		code: "defect_broken",
		labelRu: "Заводской брак / повреждение при вскрытии",
		descriptionRu: "Брак или механическое повреждение упаковки/изделия",
		isDefect: true,
	},
];


export function getDiscrepancyReason(code: DiscrepancyReasonCode): DiscrepancyReasonDefinition {
	const found = DISCREPANCY_REASONS.find((r) => r.code === code);
	return found || DISCREPANCY_REASONS[0]!;
}


export * from "./clinicalWriteoffMaterials.js";
export * from "./clinicalWriteoffNorms804n.js";
export * from "./clinicalWriteoffCabinetStock.js";
