/**
 * @dental/web/components/anesthesia/anesthesiaEngine.ts
 * Clinical Anesthesiology SSOT Engine (Mandates 8b 200-280 lines, 8e, 8n, 8y, 8x)
 * Autonomy, 1-click somatic status, passive safety warnings, clean Latin SOAP diary and live Fastify sync.
 */

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	DENTAL_ANESTHETICS,
	type AnestheticDrugId,
	type AnestheticDrugInfo,
	type InjectionTechniqueId,
	type NeedleGaugeType,
} from "./anesthesiaCatalogData";

export { postEmergencyAntishockWriteoff, postQuickCarpuleWriteoff } from "./anesthesiaCatalogData";

export type AsaPhysicalStatus = "asa_1" | "asa_2" | "asa_3" | "asa_4";
export type PatientAgeCategory = "adult" | "pediatric" | "geriatric";
export type AnesthesiaSafetyZone = "safe" | "caution" | "warning" | "overdose_danger";

export const EPINEPHRINE_CEILINGS_MG = {
	healthyAdult: 0.2,
	cardiovascularRisk: 0.04,
} as const;

export const ASA_CLASSIFICATIONS: Record<AsaPhysicalStatus, { nameRu: string; epiLimitMg: number; descriptionRu: string }> = {
	asa_1: { nameRu: "ASA I: Здоровый", epiLimitMg: 0.2, descriptionRu: "Без системных патологий" },
	asa_2: { nameRu: "ASA II: Легкое заболевание", epiLimitMg: 0.2, descriptionRu: "Компенсированная патология" },
	asa_3: { nameRu: "ASA III: Тяжелое заболевание", epiLimitMg: 0.04, descriptionRu: "Сердечно-сосудистый риск" },
	asa_4: { nameRu: "ASA IV: Угроза жизни", epiLimitMg: 0.04, descriptionRu: "Высокий соматический риск" },
};

/**
 * Clean chairside somatic profile (Mandate 8e, 8y — no academic bureaucracy)
 */
export interface AnesthesiaCalculationInput {
	drugId: AnestheticDrugId;
	carpulesCount: number;
	patientWeightKg?: number | null | undefined;
	patientAgeYears?: number | undefined;
	isSomaticallyHealthy?: boolean | undefined;
	hasCardiovascularRisk?: boolean | undefined;
	hasHypertension?: boolean | undefined;
	hasCardiacArrhythmia?: boolean | undefined;
	hasIschemicHeartDisease?: boolean | undefined;
	hasMyocardialInfarctionHistory?: boolean | undefined;
	takesBetaBlockers?: boolean | undefined;
	takesTricyclicAntidepressants?: boolean | undefined;
	takesMaoInhibitors?: boolean | undefined;
	hasThyrotoxicosis?: boolean | undefined;
	hasSulfiteAllergy?: boolean | undefined;
	hasBronchialAsthma?: boolean | undefined;
	isPregnantOrLactating?: boolean | undefined;
	asaStatus?: AsaPhysicalStatus | undefined;
	techniqueId?: InjectionTechniqueId | undefined;
	needleType?: NeedleGaugeType | undefined;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed?: boolean | undefined;
	overrideReason?: string | undefined;
}

export interface AnesthesiaCalculationResult {
	drug: AnestheticDrugInfo;
	carpulesCount: number;
	injectedVolumeMl: number;
	injectedActiveMg: number;
	injectedEpinephrineMg: number;
	maxSafeActiveMg: number;
	maxSafeEpinephrineMg: number;
	maxSafeCarpulesCount: number;
	remainingSafeCarpulesCount: number;
	percentOfMaxDose: number;
	percentOfEpiMaxDose: number;
	safetyZone: AnesthesiaSafetyZone;
	isSomaticallyHealthy: boolean;
	isOverdose: boolean;
	isEpinephrineOverdose: boolean;
	isCardioRisk: boolean;
	contraindicationsTriggered: string[];
	warnings: string[];
	cardioRiskReasons: string[];
	ageCategory: PatientAgeCategory;
	ageDoseReductionFactor: number;
	diaryEntryRu: string;
}

export interface AnesthesiaPatientMemoParams {
	clinicName: string;
	clinicPhone: string;
	patientName: string;
	doctorName: string;
	drugTradeName: string;
	carpulesCount: number;
	targetArea?: string | undefined;
	expectedDurationHours?: string | undefined;
	date?: string | undefined;
}

export function resolveClinicalDefaultWeightKg(weight?: number | null, age?: number, isPediatric?: boolean): number {
	if (typeof weight === "number" && weight > 0) return weight;
	if (isPediatric || (typeof age === "number" && age < 18)) {
		const a = age ?? 10;
		return a <= 1 ? 10 : a <= 3 ? 15 : a <= 7 ? 25 : a <= 10 ? 30 : 45;
	}
	return 70;
}

export function calculateAnesthesiaSafety(input: AnesthesiaCalculationInput): AnesthesiaCalculationResult {
	const drug = DENTAL_ANESTHETICS[input.drugId] || DENTAL_ANESTHETICS.articaine_1_100k;
	const age = input.patientAgeYears ?? 35;
	const isPediatric = age < 18 || (typeof input.patientWeightKg === "number" && input.patientWeightKg > 0 && input.patientWeightKg < 40);
	const ageCategory: PatientAgeCategory = isPediatric ? "pediatric" : age >= 65 ? "geriatric" : "adult";
	const ageFactor = age >= 65 ? 0.7 : 1.0;

	const weight = resolveClinicalDefaultWeightKg(input.patientWeightKg, age, isPediatric);
	const carpules = Math.max(0, input.carpulesCount);

	const isCardioRisk = Boolean(
		!input.isSomaticallyHealthy &&
		(input.hasCardiovascularRisk ||
		input.hasHypertension ||
		input.hasCardiacArrhythmia ||
		input.hasIschemicHeartDisease ||
		input.hasMyocardialInfarctionHistory ||
		input.takesBetaBlockers ||
		input.asaStatus === "asa_3" ||
		input.asaStatus === "asa_4"),
	);

	const injectedVolumeMl = Number((carpules * drug.carpuleVolumeMl).toFixed(2));
	const injectedActiveMg = Number((carpules * drug.mgActivePerCarpule).toFixed(1));
	const injectedEpinephrineMg = Number((carpules * drug.mgEpiPerCarpule).toFixed(4));

	const maxRatePerKg = isPediatric && drug.id.includes("articaine") ? 5.0 : drug.maxDoseMgPerKgAdult;
	const maxSafeActiveMg = Number((Math.min(maxRatePerKg * weight * ageFactor, drug.absoluteMaxDoseMgAdult * ageFactor)).toFixed(1));
	const maxSafeEpinephrineMg = drug.isAdrenalineFree ? 0 : isCardioRisk ? EPINEPHRINE_CEILINGS_MG.cardiovascularRisk : EPINEPHRINE_CEILINGS_MG.healthyAdult;

	const maxCarpByActive = drug.mgActivePerCarpule > 0 ? Math.floor((maxSafeActiveMg / drug.mgActivePerCarpule) * 10) / 10 : 99;
	const maxCarpByEpi = !drug.isAdrenalineFree && drug.mgEpiPerCarpule > 0 ? Math.floor((maxSafeEpinephrineMg / drug.mgEpiPerCarpule) * 10) / 10 : 99;
	const maxSafeCarpulesCount = Number(Math.min(maxCarpByActive, maxCarpByEpi).toFixed(1));
	const remainingSafeCarpulesCount = Number(Math.max(0, maxSafeCarpulesCount - carpules).toFixed(1));

	const isOverdose = injectedActiveMg > maxSafeActiveMg;
	const isEpinephrineOverdose = !drug.isAdrenalineFree && injectedEpinephrineMg > maxSafeEpinephrineMg;

	const percentOfMaxDose = maxSafeActiveMg > 0 ? Math.round((injectedActiveMg / maxSafeActiveMg) * 100) : 0;
	const percentOfEpiMaxDose = maxSafeEpinephrineMg > 0 ? Math.round((injectedEpinephrineMg / maxSafeEpinephrineMg) * 100) : 0;

	const safetyZone: AnesthesiaSafetyZone = isOverdose || isEpinephrineOverdose
		? "overdose_danger"
		: percentOfMaxDose > 80 || percentOfEpiMaxDose > 80
			? "warning"
			: percentOfMaxDose > 60
				? "caution"
				: "safe";

	const warnings: string[] = [];
	const contraindicationsTriggered: string[] = [];
	const cardioRiskReasons: string[] = [];

	if (isCardioRisk) cardioRiskReasons.push("сердечно-сосудистый профиль");
	if (input.hasSulfiteAllergy && drug.containsSulfites) {
		contraindicationsTriggered.push("ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ (аллергия на сульфиты: рекомендован Скандонест 3%)");
		warnings.push("ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ");
	}
	if (isOverdose) {
		warnings.push(`ПРЕВЫШЕНИЕ МАКСИМАЛЬНОЙ СУТОЧНОЙ ДОЗЫ (${injectedActiveMg} мг > ${maxSafeActiveMg} мг)`);
	}
	if (isEpinephrineOverdose) {
		warnings.push(`Превышен кардиоваскулярный лимит адреналина (${injectedEpinephrineMg.toFixed(3)} мг > ${maxSafeEpinephrineMg} мг)`);
	}
	if (input.techniqueId?.includes("mandibular") && input.aspirationNegativeConfirmed === false) {
		warnings.push("Аспирационная проба обязательна при проводниковой анестезии");
	}

	const techNameRu = input.techniqueId?.includes("mandibular") ? "проводниковая" : input.techniqueId?.includes("intraligamentary") ? "интралигаментарная" : "инфильтрационная";
	const toothPart = input.targetToothNumberFdi ? ` в области зуба ${input.targetToothNumberFdi}` : "";
	const latinFormula = drug.id === "mepivacaine_plain"
		? "Sol. Mepivacaini 3% (sine Epinephrino)"
		: drug.id === "articaine_1_200k"
			? "Sol. Articaini 4% cum Epinephrini 1:200 000"
			: drug.id === "lidocaine_1_100k"
				? "Sol. Lidocaini 2% cum Epinephrini 1:100 000"
				: "Sol. Articaini 4% cum Epinephrini 1:100 000";

	const carpText = carpules === 1 ? "1.7 мл (1 карпула)" : `${injectedVolumeMl} мл (${carpules} карп.)`;
	const aspirationText = input.aspirationNegativeConfirmed !== false ? "Аспирационная проба отрицательная. " : "";
	const diaryEntryRu = `Проведена ${techNameRu} анестезия${toothPart} ${latinFormula} — ${carpText}. ${aspirationText}Осложнений нет.`;

	return {
		drug, carpulesCount: carpules, injectedVolumeMl, injectedActiveMg, injectedEpinephrineMg,
		maxSafeActiveMg, maxSafeEpinephrineMg, maxSafeCarpulesCount, remainingSafeCarpulesCount,
		percentOfMaxDose, percentOfEpiMaxDose, safetyZone, isSomaticallyHealthy: !isCardioRisk && !input.hasSulfiteAllergy,
		isOverdose, isEpinephrineOverdose, isCardioRisk, contraindicationsTriggered, warnings, cardioRiskReasons,
		ageCategory, ageDoseReductionFactor: ageFactor, diaryEntryRu,
	};
}

export function determineAgeCategory(ageYears: number): PatientAgeCategory {
	return ageYears < 18 ? "pediatric" : ageYears >= 65 ? "geriatric" : "adult";
}

export function calculateAgeReductionFactor(age: number, weightKg?: number): number {
	if (typeof weightKg === "number" && weightKg > 0 && age < 18) {
		return Number((weightKg / 70).toFixed(1));
	}
	return age >= 65 ? 0.7 : 1.0;
}

export function generateAnesthesiaDiaryEntry(params: {
	drug: AnestheticDrugInfo;
	carpulesCount: number;
	injectedVolumeMl: number;
	injectedActiveMg: number;
	injectedEpinephrineMg: number;
	techniqueId: InjectionTechniqueId;
	needleType?: NeedleGaugeType | undefined;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed?: boolean | undefined;
	overrideReason?: string | undefined;
}): string {
	const techNameRu = params.techniqueId.includes("mandibular") ? "проводниковая" : "инфильтрационная";
	const toothPart = params.targetToothNumberFdi ? ` в области зуба ${params.targetToothNumberFdi}` : "";
	const tradeName = params.drug.tradeNamesRu[0] || "Ультракаин Д-С";
	const carpText = params.carpulesCount === 1 ? "1 карпула" : `${params.carpulesCount} карп.`;
	const aspirationText = params.aspirationNegativeConfirmed !== false ? "Аспирационная проба отрицательная. " : "";

	return `Проведена ${techNameRu} анестезия${toothPart}: ${tradeName}, объем ${params.injectedVolumeMl} мл (${carpText}, ${params.injectedActiveMg} мг активного вещества). ${aspirationText}Осложнений нет.`;
}

export function formatAnesthesiaPatientMemo(params: AnesthesiaPatientMemoParams): string {
	const clinicName = params.clinicName.trim() || "Стоматологическая клиника DENTE";
	const hasCustomPhone = Boolean(params.clinicPhone && params.clinicPhone.trim().length > 0);
	const clinicPhone = hasCustomPhone ? params.clinicPhone.trim() : "";
	const phoneHeader = clinicPhone ? ` • Тел: ${clinicPhone}` : "";
	const phoneFooter = clinicPhone ? ` по телефону ${clinicPhone}` : " с клиникой";
	const patientName = params.patientName.trim() || "Пациент";
	const doctorName = params.doctorName.trim() || "Лечащий врач-стоматолог";
	const drugTradeName = params.drugTradeName.trim() || "Артикаин 4%";
	const targetArea = params.targetArea ? `Область вмешательства: ${params.targetArea}\n` : "";
	const duration = params.expectedDurationHours || "2–3 часа";
	const dateStr = params.date || new Date().toLocaleDateString("ru-RU");

	return `Памятка пациенту после проведения местной анестезии
${clinicName}${phoneHeader}
Дата: ${dateStr}

Пациент: ${patientName}
Врач: ${doctorName}
Препарат: ${drugTradeName} — ${params.carpulesCount} карп.
${targetArea}Действие анестезии: ориентировочно ${duration}.

Рекомендации:
1. Не принимайте горячую пищу и напитки до полного восстановления чувствительности во избежание ожога и прикусывания слизистой щеки и языка.
2. Не растирайте и не массируйте зону инъекции.
3. При сохранении онемения более 6 часов или возникновении выраженного отёка свяжитесь${phoneFooter}.`;
}

export interface PersistAnesthesiaLogParams {
	patientId?: string | undefined;
	visitId?: string | undefined;
	drugId: AnestheticDrugId;
	techniqueId: InjectionTechniqueId;
	carpulesCount: number;
	patientWeightKg: number;
	patientAgeYears: number;
	isCardioRisk: boolean;
	targetToothNumberFdi?: number | string | undefined;
	diaryEntry: string;
}

export async function persistAnesthesiaLog(params: PersistAnesthesiaLogParams): Promise<void> {
	const isArticaine = params.drugId.includes("articaine") || params.drugId.includes("septanest");
	const isMepivacaine = params.drugId.includes("mepivacaine");
	const drugEnum = isMepivacaine ? "mepivacaine" : isArticaine ? "articaine" : "lidocaine";
	const vasoEnum = params.drugId.includes("100k") ? "1:100000" : params.drugId.includes("200k") ? "1:200000" : "none";
	const concentrationPct = isMepivacaine ? 3.0 : isArticaine ? 4.0 : 2.0;
	const brandName = DENTAL_ANESTHETICS[params.drugId]?.tradeNamesRu[0] || "Ультракаин Д-С";
	const techniqueEnum = params.techniqueId.includes("mandibular") ? "mandibular_block" : "infiltration";
	const toothNum = typeof params.targetToothNumberFdi === "number" ? params.targetToothNumberFdi : parseInt(String(params.targetToothNumberFdi || ""), 10);
	const toothNumbers = Number.isInteger(toothNum) && toothNum > 0 ? [toothNum] : [];

	const payload = {
		patientId: params.patientId || null,
		visitId: params.visitId || null,
		technique: techniqueEnum,
		drug: drugEnum,
		drugBrandName: brandName,
		concentrationPct,
		vasoconstrictor: vasoEnum,
		carpuleVolumeMl: 1.7,
		carpulesAdministered: params.carpulesCount,
		patientWeightKg: params.patientWeightKg || 70,
		patientAgeYears: params.patientAgeYears ?? 35,
		asaClass: params.isCardioRisk ? "ASA_III" : "ASA_I",
		hasCardiovascularDisease: params.isCardioRisk,
		aspirationTestPositive: false,
		toothNumbers,
		notes: params.diaryEntry,
		autoDeductInventory: true,
		addToVisitEstimate: true,
	};

	try {
		const endpoint = params.patientId ? `/api/anesthesia/patients/${params.patientId}/logs` : "/api/anesthesia/logs";
		await fetch(endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify(payload),
		});
	} catch (err) {
		console.warn("[anesthesia] Log persist fallback:", err);
	}
}
