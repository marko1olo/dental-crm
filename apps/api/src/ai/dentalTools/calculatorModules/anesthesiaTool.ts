/**
 * @file anesthesiaTool.ts
 * @description Расчет безопасной дозировки местных анестетиков по массе тела и кардио-рискам (СтАР/EBM).
 * Интегрирован с каноническим ядром calculateAnestheticSafety (@dental/shared).
 */
import { calculateAnestheticSafety, type AnestheticDrug, type VasoconstrictorRatio } from "@dental/shared";
import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const calculateAnesthesiaSchema = z.object({
	patientWeightKg: z.number().min(5, "Масса тела не менее 5 кг").max(300, "Масса тела не более 300 кг").optional().describe("Масса тела пациента в кг"),
	anestheticType: z.enum(["articaine_1_100000", "articaine_1_200000", "mepivacaine_3_plain", "auto"]).default("auto").describe("Тип анестетика"),
	hasCardiovascularRisk: z.boolean().default(false).describe("Наличие сердечно-сосудистой патологии"),
	isPregnancy: z.boolean().default(false).describe("Беременность (рекомендован вазоконстриктор 1:200 000)"),
	plannedCarpules: z.number().min(0.5, "Минимум 0.5 карпулы").max(15, "Максимум 15 карпул").default(1).describe("Планируемое количество карпул"),
});

export type CalculateAnesthesiaInput = z.input<typeof calculateAnesthesiaSchema>;

export interface CalculateAnesthesiaResult {
	readonly drugName: string;
	readonly tradeNameSample: string;
	readonly concentrationPercent: number;
	readonly vasoconstrictorRatio: string | null;
	readonly patientWeightKg: number;
	readonly maxDoseMg: number;
	readonly mgPerCarpule: number;
	readonly maxCarpulesByAnesthetic: number;
	readonly maxCarpulesByEpinephrine: number;
	readonly absoluteMaxCarpules: number;
	readonly recommendedCarpules: number;
	readonly plannedCarpules: number;
	readonly epinephrineMcgPerCarpule: number;
	readonly totalEpinephrineMcg: number;
	readonly maxSafeEpinephrineMcg: number;
	readonly isCardiovascularRisk: boolean;
	readonly isPregnancy: boolean;
	readonly warnings: readonly string[];
	readonly safeToProceed: boolean;
	readonly clinicalProtocolSummary: string;
}

interface AnestheticPreset {
	drug: AnestheticDrug;
	name: string;
	trade: string;
	conc: number;
	ratio: VasoconstrictorRatio;
	ratioLabel: string | null;
	carpuleMl: number;
	mgCarp: number;
	epiCarpMcg: number;
}

const DEFAULT_ARTICAINE_1_100000: AnestheticPreset = {
	drug: "articaine",
	name: "Артикаин 4% с эпинефрином 1:100 000",
	trade: "Ультракаин Д-С форте / Септанест 1:100 000",
	conc: 4,
	ratio: "1:100000",
	ratioLabel: "1:100 000",
	carpuleMl: 1.7,
	mgCarp: 68,
	epiCarpMcg: 17,
};

const DRUGS: Record<string, AnestheticPreset> = {
	articaine_1_100000: DEFAULT_ARTICAINE_1_100000,
	articaine_1_200000: {
		drug: "articaine",
		name: "Артикаин 4% с эпинефрином 1:200 000",
		trade: "Ультракаин Д-С / Убистезин 1:200 000",
		conc: 4,
		ratio: "1:200000",
		ratioLabel: "1:200 000",
		carpuleMl: 1.7,
		mgCarp: 68,
		epiCarpMcg: 8.5,
	},
	mepivacaine_3_plain: {
		drug: "mepivacaine",
		name: "Мепивакаин 3% без вазоконстриктора",
		trade: "Скандонест 3% / Мепивастезин",
		conc: 3,
		ratio: "none",
		ratioLabel: null,
		carpuleMl: 1.7,
		mgCarp: 51,
		epiCarpMcg: 0,
	},
};

export async function handleCalculateAnesthesia(args: CalculateAnesthesiaInput, _context: DentalToolContext): Promise<CalculateAnesthesiaResult> {
	const weight = args.patientWeightKg ?? 70;
	const hasCardio = args.hasCardiovascularRisk ?? false;
	const isPregnancy = args.isPregnancy ?? false;
	const planned = args.plannedCarpules ?? 1;
	let type = args.anestheticType ?? "auto";
	const warnings: string[] = [];

	if (type === "auto") {
		type = hasCardio ? "mepivacaine_3_plain" : isPregnancy ? "articaine_1_200000" : "articaine_1_100000";
	} else if (hasCardio && type === "articaine_1_100000") {
		warnings.push("КЛИНИЧЕСКОЕ ПРЕДОСТЕРЕЖЕНИЕ (СтАР): При сердечно-сосудистой патологии (ИБС, гипертония, бета-блокаторы) раствор 1:100 000 несет риск гипертонического криза. Рекомендовано переключение на 1:200 000 либо Мепивакаин 3% без вазоконстриктора.");
	}

	const spec = DRUGS[type] ?? DEFAULT_ARTICAINE_1_100000;

	// Делегируем в канонический SSOT калькулятор @dental/shared
	const safety = calculateAnestheticSafety({
		drug: spec.drug,
		concentrationPct: spec.conc,
		vasoconstrictor: spec.ratio,
		carpuleVolumeMl: spec.carpuleMl,
		carpulesAdministered: planned,
		patientWeightKg: weight,
		asaClass: hasCardio ? "ASA_III" : "ASA_I",
		hasCardiovascularDisease: hasCardio,
	});

	if (safety.clinicalWarnings.length > 0) {
		warnings.push(...safety.clinicalWarnings);
	}

	const maxSafeEpi = hasCardio ? 40 : 200;
	const maxDoseMg = safety.maxRecommendedAnestheticMg;
	const absMax = Math.max(1, Math.floor(safety.maxSafeCarpules));
	const recCarp = Math.min(planned, absMax);
	const totalEpi = Number((recCarp * spec.epiCarpMcg).toFixed(1));

	if (planned > absMax) {
		warnings.push(`Превышение дозы: Запланировано ${planned} карп., что превышает безопасный лимит (${absMax} карп. для массы ${weight} кг). Доза ограничена ${recCarp} карп.`);
	}

	const summary = [
		`Анестетик: ${spec.name} (${spec.trade}).`,
		`Пациент: ${weight} кг. Предел активного вещества: ${maxDoseMg} мг (${absMax} карп. по ${spec.carpuleMl} мл).`,
		`К введению: ${recCarp} карп. (${recCarp * spec.mgCarp} мг анестетика).`,
		spec.epiCarpMcg > 0 ? `Нагрузка адреналина: ${totalEpi} мкг из допустимых ${maxSafeEpi} мкг.` : "Без адреналина (кардио-профиль).",
		warnings.length > 0 ? `ВНИМАНИЕ: ${warnings.join(" ")}` : "Соматических ограничений нет.",
	].join(" ");

	return {
		drugName: spec.name, tradeNameSample: spec.trade, concentrationPercent: spec.conc, vasoconstrictorRatio: spec.ratioLabel,
		patientWeightKg: weight, maxDoseMg, mgPerCarpule: spec.mgCarp, maxCarpulesByAnesthetic: Math.floor(maxDoseMg / spec.mgCarp),
		maxCarpulesByEpinephrine: spec.epiCarpMcg > 0 ? Math.floor(maxSafeEpi / spec.epiCarpMcg) : 999, absoluteMaxCarpules: absMax, recommendedCarpules: recCarp, plannedCarpules: planned,
		epinephrineMcgPerCarpule: spec.epiCarpMcg, totalEpinephrineMcg: totalEpi, maxSafeEpinephrineMcg: maxSafeEpi,
		isCardiovascularRisk: hasCardio, isPregnancy, warnings, safeToProceed: true, clinicalProtocolSummary: summary,
	};
}

export const calculateAnesthesiaTool: DentalToolEntry<typeof calculateAnesthesiaSchema> = {
	name: "calculate_anesthesia",
	description: "Расчет клинически безопасной дозировки местного анестетика (артикаин 4%, мепивакаин 3%) по массе тела в кг и кардио-рискам. Лимиты EBM/СтАР: 7.0 мг/кг, потолок 500 мг, адреналин макс 0.04 мг при патологии ССС.",
	schema: calculateAnesthesiaSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("calculate_anesthesia", "Расчет дозировки местного анестетика по массе тела пациента и соматике (артикаин 4%, мепивакаин 3%). Соответствует стандартам СтАР.", calculateAnesthesiaSchema),
	handler: handleCalculateAnesthesia,
};

export const anesthesiaTool = calculateAnesthesiaTool;
