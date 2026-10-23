/**
 * CLINICAL DENTAL WARRANTY ENGINE — CORE TYPES
 * Mandate 8b: strict file length budget <= 120 lines.
 */

import type { WarrantyCategory } from "./warrantyPresets.js";

export interface WarrantyRiskFactors {
	/** Гигиенический индекс Green-Vermillion (OHI-S: 0.0 - 6.0) */
	hygieneScore: number;
	/** Индекс КПУ (кариозные, пломбированные, удаленные) */
	kpuIndex?: number | undefined;
	/** Наличие бруксизма / парафункции жевательных мышц */
	bruxism: boolean;
	/** Назначена ли индивидуальная окклюзионная защитная каппа */
	nightGuardPrescribed: boolean;
	/** Пациент подтверждает регулярное ношение каппы */
	nightGuardUsed: boolean;
	/** Статус курения */
	smoking: "none" | "light" | "heavy";
	/** Сахарный диабет */
	diabetes: "none" | "compensated" | "decompensated";
	/** Патология прикуса / глубокий травматический прикус */
	malocclusion: boolean;
	/** Степень тяжести генерализованного пародонтита */
	periodontitis: "none" | "mild" | "moderate" | "severe";
	/** Нарушение графика визитов / комплаентность */
	poorCompliance?: boolean | undefined;
	/** Наличие остеопороза / бисфосфонаты */
	osteoporosis?: boolean | undefined;
}

export interface WarrantyItem {
	id: string;
	toothNumber: string;
	category: WarrantyCategory;
	clinicalWorkTitle: string;
	materialName: string;
	manufacturer: string;
	country: string;
	vitaShade?: string | undefined;
	lotNumber?: string | undefined;
	serviceCode?: string | undefined;
	serviceCode804n?: string | undefined;
	labOrderNumber?: string | undefined;
	implantDiameterMm?: number | undefined;
	implantLengthMm?: number | undefined;
	baseWarrantyMonths: number;
	baseServiceLifeMonths: number;
	customWarrantyMonths?: number | undefined;
	customServiceLifeMonths?: number | undefined;
}

export interface AppliedRiskFactor {
	factor: string;
	multiplier: number;
	description: string;
	severity: "info" | "warning" | "danger";
}

export interface CheckupScheduleItem {
	index: number;
	dueDate: string;
	formattedDate: string;
	recommendedProcedures: string[];
	isMandatory: boolean;
}

export interface WarrantyCalculationResult {
	baseWarrantyMonths: number;
	baseServiceLifeMonths: number;
	adjustedWarrantyMonths: number;
	adjustedServiceLifeMonths: number;
	totalRiskMultiplier: number;
	riskLevel: "low" | "moderate" | "high" | "critical";
	warrantyStatus: "full" | "conditional" | "reduced" | "void_risk";
	checkupIntervalMonths: number;
	issueDate: string;
	warrantyExpirationDate: string;
	serviceLifeExpirationDate: string;
	nextCheckupDueDateDate?: string | undefined;
	nextCheckupDueDate: string;
	checkupSchedule: CheckupScheduleItem[];
	riskFactorsApplied: AppliedRiskFactor[];
	clinicalRationale: string[];
	specialProvisions: string[];
}
