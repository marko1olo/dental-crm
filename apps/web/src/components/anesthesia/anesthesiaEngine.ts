/**
 * @dental/web/components/anesthesia/anesthesiaEngine.ts
 * Clinical Anesthesiology & Pharmacology Safety Engine (Минздрав РФ / СтАР / AHA)
 * Consolidated SSOT Engine (Mandates 8b, 8e, 8n, 8y)
 */

import { resolveClinicalDefaultWeightKg as sharedResolveDefaultWeight } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	DENTAL_ANESTHETICS,
	INJECTION_TECHNIQUES,
	type AnestheticDrugId,
	type AnestheticDrugInfo,
	type InjectionTechniqueId,
	type NeedleGaugeType,
} from "./anesthesiaCatalog";

export type AsaPhysicalStatus = "asa_1" | "asa_2" | "asa_3" | "asa_4";
export type PatientAgeCategory = "adult" | "pediatric" | "geriatric";
export type AnesthesiaSafetyZone = "safe" | "caution" | "warning" | "overdose_danger";

export const EPINEPHRINE_CEILINGS_MG = {
	healthyAdult: 0.2, // 200 mcg for ASA I & II
	cardiovascularRisk: 0.04, // 40 mcg for ASA III & IV, IHD, Beta-blockers
} as const;

export const ASA_CLASSIFICATIONS: Record<
	AsaPhysicalStatus,
	{ nameRu: string; epiLimitMg: number; descriptionRu: string }
> = {
	asa_1: {
		nameRu: "ASA I: Здоровый пациент",
		epiLimitMg: 0.2,
		descriptionRu: "Без системных патологий, физиологическая норма.",
	},
	asa_2: {
		nameRu: "ASA II: Легкое системное заболевание",
		epiLimitMg: 0.2,
		descriptionRu: "Компенсированная гипертония, легкая астма, курение, контролируемый диабет 2 типа.",
	},
	asa_3: {
		nameRu: "ASA III: Тяжелое системное заболевание",
		epiLimitMg: 0.04,
		descriptionRu: "ИБС, стенокардия напряжения, перенесенный инфаркт (>6 мес), ХОБЛ, инсулинозависимый диабет.",
	},
	asa_4: {
		nameRu: "ASA IV: Заболевание, угрожающее жизни",
		epiLimitMg: 0.04,
		descriptionRu: "Нестабильная стенокардия, недавний инфаркт (<6 мес), декомпенсированная сердечная недостаточность.",
	},
};

export interface AnesthesiaCalculationInput {
	drugId: AnestheticDrugId;
	carpulesCount: number;
	patientWeightKg?: number | null | undefined;
	patientAgeYears: number;
	asaStatus: AsaPhysicalStatus;
	hasCardiovascularRisk: boolean;
	hasHypertension?: boolean | undefined;
	hasCardiacArrhythmia?: boolean | undefined;
	hasIschemicHeartDisease?: boolean | undefined;
	hasMyocardialInfarctionHistory?: boolean | undefined;
	takesBetaBlockers?: boolean | undefined;
	takesTricyclicAntidepressants?: boolean | undefined;
	takesMaoInhibitors?: boolean | undefined;
	hasThyrotoxicosis?: boolean | undefined;
	hasSulfiteAllergy: boolean;
	hasBronchialAsthma: boolean;
	isPregnantOrLactating: boolean;
	isSomaticallyHealthy?: boolean | undefined;
	techniqueId: InjectionTechniqueId;
	needleType: NeedleGaugeType;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed: boolean;
	carpuleBatch?: { seriesNumber: string; batchNumber: string; expirationDate: string } | undefined;
	nurseFullName?: string | undefined;
	bpSystolic?: number | undefined;
	bpDiastolic?: number | undefined;
	heartRateBpm?: number | undefined;
	spo2Percent?: number | undefined;
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
	isOverdose: boolean;
	isEpinephrineOverdose: boolean;
	isCardioRisk: boolean;
	isSomaticallyHealthy: boolean;
	cardioRiskReasons: string[];
	ageCategory: PatientAgeCategory;
	ageDoseReductionFactor: number;
	contraindicationsTriggered: string[];
	warnings: string[];
	diaryEntryRu: string;
}

export interface AnesthesiaDiaryParams {
	drug: AnestheticDrugInfo;
	carpulesCount: number;
	injectedVolumeMl: number;
	injectedActiveMg?: number | undefined;
	injectedEpinephrineMg?: number | undefined;
	techniqueId: InjectionTechniqueId;
	needleType?: NeedleGaugeType | undefined;
	targetToothNumberFdi?: number | string | undefined;
	aspirationNegativeConfirmed?: boolean | undefined;
	carpuleBatch?: { seriesNumber: string; batchNumber: string; expirationDate: string } | undefined;
	nurseFullName?: string | undefined;
	bpSystolic?: number | undefined;
	bpDiastolic?: number | undefined;
	heartRateBpm?: number | undefined;
	spo2Percent?: number | undefined;
	overrideReason?: string | undefined;
	isOverdose?: boolean | undefined;
	isEpinephrineOverdose?: boolean | undefined;
}

export interface AnesthesiaPatientMemoParams {
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly patientName: string;
	readonly doctorName: string;
	readonly drugTradeName: string;
	readonly carpulesCount: number;
	readonly targetArea: string | number;
	readonly expectedDurationHours?: string | undefined;
	readonly date?: string | undefined;
}

export function resolveClinicalDefaultWeightKg(
	weight?: number | null,
	age?: number | null,
	isPediatric?: boolean,
): number {
	if (typeof weight === "number" && weight > 0) return weight;
	if (sharedResolveDefaultWeight) {
		const val = sharedResolveDefaultWeight(weight ?? undefined, age ?? undefined, isPediatric ?? false);
		if (val > 0) return val;
	}
	if (typeof age === "number" && age < 18) {
		if (age <= 1) return 10;
		if (age <= 3) return 15;
		if (age <= 6) return 20;
		if (age <= 10) return 30;
		if (age <= 14) return 45;
		return 55;
	}
	return 70;
}

export function determineAgeCategory(ageYears: number): PatientAgeCategory {
	if (ageYears < 18) return "pediatric";
	if (ageYears >= 65) return "geriatric";
	return "adult";
}

export function calculateAgeReductionFactor(ageYears: number, weightKg?: number): number {
	if (ageYears < 18 && typeof weightKg === "number" && weightKg > 0) {
		return Math.min(1.0, Number((weightKg / 70).toFixed(2)));
	}
	if (ageYears >= 65) {
		return 0.7; // 30% reduction for geriatric patients
	}
	return 1.0;
}

export function calculateMaxSafeActiveMg(
	drug: AnestheticDrugInfo,
	weight: number,
	isPediatric: boolean,
	ageFactor: number,
): number {
	const effectiveMaxMgPerKg = isPediatric
		? drug.id.startsWith("articaine")
			? 5.0
			: drug.maxDoseMgPerKgAdult
		: drug.maxDoseMgPerKgAdult;

	const maxActiveByWeight = weight * effectiveMaxMgPerKg * ageFactor;
	return isPediatric
		? Number(maxActiveByWeight.toFixed(1))
		: Number(Math.min(drug.absoluteMaxDoseMgAdult * ageFactor, maxActiveByWeight).toFixed(1));
}

export function resolveMaxSafeEpinephrineMg(input: AnesthesiaCalculationInput): number {
	const hasCardio =
		Boolean(input.hasCardiovascularRisk || input.hasIschemicHeartDisease || input.hasMyocardialInfarctionHistory) ||
		Boolean(input.hasHypertension || input.hasCardiacArrhythmia || input.takesBetaBlockers) ||
		(typeof input.bpSystolic === "number" && input.bpSystolic >= 140) ||
		(typeof input.bpDiastolic === "number" && input.bpDiastolic >= 90) ||
		(typeof input.heartRateBpm === "number" && input.heartRateBpm > 90) ||
		input.asaStatus === "asa_3" ||
		input.asaStatus === "asa_4";

	return hasCardio ? EPINEPHRINE_CEILINGS_MG.cardiovascularRisk : EPINEPHRINE_CEILINGS_MG.healthyAdult;
}

export function calculateCarpuleLimits(
	drug: AnestheticDrugInfo,
	maxSafeActiveMg: number,
	maxSafeEpiMg: number,
	carpules: number,
) {
	const maxByActive = drug.mgActivePerCarpule > 0 ? maxSafeActiveMg / drug.mgActivePerCarpule : 99;
	const maxByEpi = !drug.isAdrenalineFree && drug.mgEpiPerCarpule > 0 ? maxSafeEpiMg / drug.mgEpiPerCarpule : 99;
	const maxSafeCarpulesCount = Math.floor(Math.min(maxByActive, maxByEpi) * 10) / 10;
	const remainingSafeCarpulesCount = Math.max(0, Math.floor((maxSafeCarpulesCount - carpules) * 10) / 10);
	return { maxSafeCarpulesCount, remainingSafeCarpulesCount };
}

export function determineSafetyZone(percentActive: number, percentEpi: number): AnesthesiaSafetyZone {
	const highest = Math.max(percentActive, percentEpi);
	if (highest > 100) return "overdose_danger";
	if (highest > 90) return "warning";
	if (highest > 70) return "caution";
	return "safe";
}

export function collectCardioRiskReasons(input: AnesthesiaCalculationInput): string[] {
	const reasons: (string | false | undefined)[] = [
		input.hasCardiovascularRisk && "сердечно-сосудистая патология",
		input.hasIschemicHeartDisease && "ИБС",
		input.hasMyocardialInfarctionHistory && "инфаркт миокарда в анамнезе",
		input.hasHypertension && "артериальная гипертония",
		input.hasCardiacArrhythmia && "аритмия",
		input.takesBetaBlockers && "прием бета-блокаторов",
		input.asaStatus === "asa_3" && "статус ASA III",
		input.asaStatus === "asa_4" && "статус ASA IV",
	];
	return reasons.filter((r): r is string => Boolean(r));
}

export interface EvaluatedSafetyAdvisory {
	cardioRiskReasons: string[];
	isCardioRisk: boolean;
	contraindicationsTriggered: string[];
	warnings: string[];
	isOverdose: boolean;
	isEpinephrineOverdose: boolean;
}

export function evaluateSafetyAdvisories(
	input: AnesthesiaCalculationInput,
	drug: AnestheticDrugInfo,
	metrics: {
		injectedActiveMg: number;
		maxSafeActiveMg: number;
		injectedEpinephrineMg: number;
		maxSafeEpinephrineMg: number;
	},
): EvaluatedSafetyAdvisory {
	const cardioRiskReasons = collectCardioRiskReasons(input);
	const isCardioRisk = cardioRiskReasons.length > 0;
	const isOverdose = metrics.injectedActiveMg > metrics.maxSafeActiveMg;
	const isEpinephrineOverdose = !drug.isAdrenalineFree && metrics.injectedEpinephrineMg > metrics.maxSafeEpinephrineMg;

	const contraindicationsTriggered: string[] = [];
	const warnings: string[] = [];

	if (drug.containsSulfites && (input.hasSulfiteAllergy || input.hasBronchialAsthma)) {
		contraindicationsTriggered.push("Препарат содержит сульфиты. Рекомендован Мепивакаин 3% (Скандонест) без адреналина.");
	}
	if (!drug.isAdrenalineFree && input.takesMaoInhibitors) {
		contraindicationsTriggered.push("Прием ингибиторов МАО: вазоконстрикторы противопоказаны. Рекомендован Мепивакаин 3% без адреналина.");
	}
	if (input.takesTricyclicAntidepressants && drug.vasoconstrictorRatio === "1:100000") {
		contraindicationsTriggered.push("Прием трициклических антидепрессантов: рекомендован Мепивакаин 3% или Артикаин 1:200 000 с осторожностью.");
	}
	if (!drug.isAdrenalineFree && (input.hasThyrotoxicosis || input.hasCardiacArrhythmia)) {
		contraindicationsTriggered.push("Тиреотоксикоз / Нарушения ритма: рекомендован Мепивакаин 3% без адреналина.");
	}
	if (!drug.isAdrenalineFree && input.asaStatus === "asa_4") {
		warnings.push("Статус ASA IV: рекомендован Мепивакаин 3% без адреналина.");
	}
	if (isCardioRisk && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push(`Кардио-профиль (${cardioRiskReasons.join(", ")}): рекомендован Артикаин 1:200 000 или Скандонест 3%.`);
	}
	if (input.isPregnantOrLactating && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push("Беременность / Лактация: предпочтителен Артикаин 1:200 000 или Скандонест 3%.");
	}
	if (isEpinephrineOverdose) {
		warnings.push(`Превышен кардиоваскулярный ориентир адреналина (${metrics.injectedEpinephrineMg.toFixed(3)} мг > ${metrics.maxSafeEpinephrineMg.toFixed(3)} мг).`);
	}
	if (isOverdose) {
		warnings.push(`Превышение максимальной суточной дозы (${metrics.injectedActiveMg} мг > ${metrics.maxSafeActiveMg} мг).`);
	}

	return {
		cardioRiskReasons,
		isCardioRisk,
		contraindicationsTriggered,
		warnings,
		isOverdose,
		isEpinephrineOverdose,
	};
}

function resolveLatinDrugFormula(drug: AnestheticDrugInfo): string {
	switch (drug.id) {
		case "articaine_1_200k":
			return "Sol. Articaini 4% cum Epinephrini 1:200 000";
		case "articaine_1_100k":
			return "Sol. Articaini 4% cum Epinephrini 1:100 000";
		case "mepivacaine_plain":
			return "Sol. Mepivacaini 3% (sine Epinephrini)";
		case "septanest_1_100k":
			return "Sol. Septanest 4% cum Epinephrini 1:100 000";
		case "lidocaine_1_100k":
			return "Sol. Lidocaini 2% cum Epinephrini 1:100 000";
		case "bupivacaine_05":
			return "Sol. Bupivacaini 0.5%";
		default:
			return `Sol. ${drug.activeSubstanceRu}`;
	}
}

function formatClinicalCarpulesText(count: number): string {
	if (count === 1) return "1 карпула";
	if (count === 0.5) return "0.5 карпулы";
	if (count === 1.5) return "1.5 карпулы";
	if (count === 2) return "2 карпулы";
	if (count === 3) return "3 карпулы";
	if (count === 4) return "4 карпулы";
	return `${count} карпул`;
}

export function generateAnesthesiaDiaryEntry(params: AnesthesiaDiaryParams): string {
	const tech = INJECTION_TECHNIQUES[params.techniqueId] || INJECTION_TECHNIQUES.infiltration;
	const techNameRu = tech.nameRu.includes("Инфильтрационная")
		? "инфильтрационная"
		: tech.nameRu.includes("Проводниковая") || tech.nameRu.includes("Торусальная")
			? "проводниковая"
			: tech.nameRu.includes("Интралигаментарная")
				? "интралигаментарная"
				: tech.nameRu.toLowerCase().split(" ")[0] || "местная";

	const toothPart = params.targetToothNumberFdi ? ` в области зуба ${params.targetToothNumberFdi}` : "";
	const drugFormula = resolveLatinDrugFormula(params.drug);
	const carpulesText = formatClinicalCarpulesText(params.carpulesCount);
	const overrideNote = params.overrideReason ? ` [Клиническое решение врача: ${params.overrideReason}]` : "";

	return `Проведена ${techNameRu} анестезия${toothPart} ${drugFormula} — ${params.injectedVolumeMl} мл (${carpulesText}). Анестезия наступила через 3 минуты, без осложнений. Осложнений нет.${overrideNote}`;
}

export function formatAnesthesiaPatientMemo(params: AnesthesiaPatientMemoParams): string {
	const clinicName = params.clinicName.trim() || "Стоматологическая клиника DENTE";
	const clinicPhone = params.clinicPhone ? params.clinicPhone.trim() : "";
	const patientName = params.patientName.trim() || "Пациент";
	const doctorName = params.doctorName.trim() || "Лечащий врач-стоматолог";
	const date = params.date || new Date().toLocaleDateString("ru-RU");
	const duration = params.expectedDurationHours || "2–3 часа";

	return [
		`Памятка пациенту после проведения местной анестезии (клиника «${clinicName}»):`,
		`Пациент: ${patientName}`,
		`Лечащий врач: ${doctorName}`,
		`Дата процедуры: ${date}`,
		`Применённый препарат: ${params.drugTradeName} (введено ${params.carpulesCount} карп.)`,
		`Область анестезии: ${params.targetArea}`,
		`Ожидаемая длительность онемения: ${duration}`,
		`Правила безопасности после анестезии:`,
		`1. Не принимайте горячую пищу и напитки до полного восстановления чувствительности (риск незаметного термического ожога слизистой).`,
		`2. Не прикусывайте онемевшую губу, щёку или язык.`,
		`3. Не массируйте и не согревайте место инъекции.`,
		`4. При сохранении выраженного онемения более 6 часов или аллергических реакциях немедленно свяжитесь с клиникой${clinicPhone ? `: ${clinicPhone}` : ""}.`,
	].join("\n");
}

export function calculateAnesthesiaSafety(input: AnesthesiaCalculationInput): AnesthesiaCalculationResult {
	const drug = DENTAL_ANESTHETICS[input.drugId] || DENTAL_ANESTHETICS.articaine_1_100k;
	const ageCategory = determineAgeCategory(input.patientAgeYears);
	const hasValidInputWeight = typeof input.patientWeightKg === "number" && input.patientWeightKg > 0;
	const isPediatric = ageCategory === "pediatric" || (hasValidInputWeight && (input.patientWeightKg ?? 0) < 40);
	const weight = resolveClinicalDefaultWeightKg(input.patientWeightKg, input.patientAgeYears, isPediatric);
	const ageFactor = isPediatric ? 1.0 : calculateAgeReductionFactor(input.patientAgeYears, weight);
	const carpules = Math.max(0, input.carpulesCount);

	const injectedVolumeMl = Number((carpules * drug.carpuleVolumeMl).toFixed(2));
	const injectedActiveMg = Number((carpules * drug.mgActivePerCarpule).toFixed(1));
	const injectedEpinephrineMg = Number((carpules * drug.mgEpiPerCarpule).toFixed(4));

	const maxSafeActiveMg = calculateMaxSafeActiveMg(drug, weight, isPediatric, ageFactor);
	const maxSafeEpinephrineMg = resolveMaxSafeEpinephrineMg(input);

	const advisory = evaluateSafetyAdvisories(input, drug, {
		injectedActiveMg,
		maxSafeActiveMg,
		injectedEpinephrineMg,
		maxSafeEpinephrineMg,
	});

	const { maxSafeCarpulesCount, remainingSafeCarpulesCount } = calculateCarpuleLimits(
		drug,
		maxSafeActiveMg,
		maxSafeEpinephrineMg,
		carpules,
	);

	const percentOfMaxDose = maxSafeActiveMg > 0 ? Math.round((injectedActiveMg / maxSafeActiveMg) * 100) : 0;
	const percentOfEpiMaxDose =
		!drug.isAdrenalineFree && maxSafeEpinephrineMg > 0
			? Math.round((injectedEpinephrineMg / maxSafeEpinephrineMg) * 100)
			: 0;

	const safetyZone = determineSafetyZone(percentOfMaxDose, percentOfEpiMaxDose);
	const isSomaticallyHealthy =
		input.isSomaticallyHealthy ??
		(!advisory.isCardioRisk && !input.hasSulfiteAllergy && !input.hasBronchialAsthma && !input.isPregnantOrLactating);

	const diaryEntryRu = generateAnesthesiaDiaryEntry({
		drug,
		carpulesCount: carpules,
		injectedVolumeMl,
		injectedActiveMg,
		injectedEpinephrineMg,
		techniqueId: input.techniqueId,
		needleType: input.needleType,
		targetToothNumberFdi: input.targetToothNumberFdi,
		aspirationNegativeConfirmed: input.aspirationNegativeConfirmed,
		isOverdose: advisory.isOverdose,
		isEpinephrineOverdose: advisory.isEpinephrineOverdose,
	});

	return {
		drug,
		carpulesCount: carpules,
		injectedVolumeMl,
		injectedActiveMg,
		injectedEpinephrineMg,
		maxSafeActiveMg,
		maxSafeEpinephrineMg,
		maxSafeCarpulesCount,
		remainingSafeCarpulesCount,
		percentOfMaxDose,
		percentOfEpiMaxDose,
		safetyZone,
		isSomaticallyHealthy,
		...advisory,
		ageCategory,
		ageDoseReductionFactor: ageFactor,
		diaryEntryRu,
	};
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

export function resolveDrugMeta(drugId: AnestheticDrugId) {
	if (drugId === "septanest_1_100k") return { drugEnum: "articaine" as const, vasoEnum: "1:100000" as const, concentrationPct: 4.0, brandName: "Септанест с адреналином 1:100 000" };
	if (drugId === "articaine_1_100k") return { drugEnum: "articaine" as const, vasoEnum: "1:100000" as const, concentrationPct: 4.0, brandName: "Ультракаин Д-С форте 1:100 000" };
	if (drugId === "mepivacaine_plain") return { drugEnum: "mepivacaine" as const, vasoEnum: "none" as const, concentrationPct: 3.0, brandName: "Скандонест 3%" };
	if (drugId === "lidocaine_1_100k") return { drugEnum: "lidocaine" as const, vasoEnum: "1:100000" as const, concentrationPct: 2.0, brandName: "Лидокаин 2% с адреналином" };
	return { drugEnum: "articaine" as const, vasoEnum: "1:200000" as const, concentrationPct: 4.0, brandName: "Ультракаин Д-С 1:200 000" };
}

export function resolveTechniqueEnum(techniqueId: InjectionTechniqueId) {
	if (techniqueId.includes("mandibular") || techniqueId.includes("torus")) return "mandibular_block" as const;
	if (techniqueId.includes("tuberal")) return "tuberal_block" as const;
	return "infiltration" as const;
}

export function persistAnesthesiaLog(params: PersistAnesthesiaLogParams): void {
	if (!params.patientId) return;
	const { drugEnum, vasoEnum, concentrationPct, brandName } = resolveDrugMeta(params.drugId);
	const techniqueEnum = resolveTechniqueEnum(params.techniqueId);
	const toothNum = typeof params.targetToothNumberFdi === "number" ? params.targetToothNumberFdi : parseInt(String(params.targetToothNumberFdi || ""), 10);
	const toothNumbers = Number.isInteger(toothNum) && toothNum > 0 ? [toothNum] : [];
	const carpuleVolumeMl = params.drugId === "mepivacaine_plain" ? 1.8 : 1.7;

	try {
		fetch(`/api/anesthesia/patients/${params.patientId}/logs`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				visitId: params.visitId || null,
				technique: techniqueEnum,
				drug: drugEnum,
				drugBrandName: brandName,
				concentrationPct,
				vasoconstrictor: vasoEnum,
				carpuleVolumeMl,
				carpulesAdministered: params.carpulesCount,
				patientWeightKg: params.patientWeightKg || 70,
				patientAgeYears: params.patientAgeYears ?? 35,
				asaClass: params.isCardioRisk ? "ASA_III" : "ASA_I",
				hasCardiovascularDisease: params.isCardioRisk,
				aspirationTestPositive: false,
				toothNumbers,
				notes: params.diaryEntry,
				autoDeductInventory: true,
				addToVisitEstimate: Boolean(params.visitId),
			}),
		}).catch((err) => console.warn("[AnesthesiaQuickBar] API write warning:", err));
	} catch (err) {
		console.warn("[AnesthesiaQuickBar] Anesthesia API request error:", err);
	}
}

export async function postEmergencyAntishockWriteoff(visitId?: string): Promise<void> {
	await fetch("/api/inventory/quick-writeoff-emergency-antishock", {
		method: "POST",
		headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		body: JSON.stringify({
			visitId: visitId || null,
			scenarioId: "anaphylactic_shock",
			notes: "Экстренное списание укладки «Антишок» у кресла",
		}),
	});
}

export async function postQuickCarpuleWriteoff(params: {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	count: number;
	drugId?: string | undefined;
	needleName?: string | undefined;
	needlesCount?: number | undefined;
}): Promise<void> {
	try {
		await fetch("/api/inventory/quick-writeoff-carpules", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				visitId: params.visitId || null,
				patientId: params.patientId || null,
				carpulesCount: params.count,
				drugName: params.drugId || "Ультракаин Д-С",
				needleName: params.needleName,
				needlesCount: params.needlesCount ?? (params.count > 0 ? 1 : 0),
				notes: `Списание ${params.count} карпул и иглы (${params.needleName || "30G"}) у кресла`,
			}),
		});
	} catch (err) {
		console.warn("[anesthesia] Quick carpule writeoff error:", err);
	}
}
