/**
 * @file anesthesiaTool.ts
 * @description Расчет безопасной дозировки местных анестетиков по массе тела и кардио-рискам (СтАР/EBM).
 */
import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const calculateAnesthesiaSchema = z.object({
	patientWeightKg: z.number().min(5, "Масса тела не менее 5 кг").max(300, "Масса тела не более 300 кг").describe("Масса тела пациента в кг"),
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

interface AnestheticSpec {
	name: string; trade: string; conc: number; ratio: string | null;
	mrd: number; maxMg: number; mgCarp: number; epiCarp: number;
}

const DRUGS: Record<string, AnestheticSpec> = {
	articaine_1_100000: { name: "Артикаин 4% с эпинефрином 1:100 000", trade: "Ультракаин Д-С форте / Септанест 1:100 000", conc: 4, ratio: "1:100 000", mrd: 7.0, maxMg: 500, mgCarp: 68, epiCarp: 17 },
	articaine_1_200000: { name: "Артикаин 4% с эпинефрином 1:200 000", trade: "Ультракаин Д-С / Убистезин 1:200 000", conc: 4, ratio: "1:200 000", mrd: 7.0, maxMg: 500, mgCarp: 68, epiCarp: 8.5 },
	mepivacaine_3_plain: { name: "Мепивакаин 3% без вазоконстриктора", trade: "Скандонест 3% / Мепивастезин", conc: 3, ratio: null, mrd: 4.4, maxMg: 300, mgCarp: 51, epiCarp: 0 },
};

export async function handleCalculateAnesthesia(args: CalculateAnesthesiaInput, _context: DentalToolContext): Promise<CalculateAnesthesiaResult> {
	const weight = args.patientWeightKg;
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

	const spec = DRUGS[type] ?? DRUGS.articaine_1_100000!;
	const maxSafeEpi = hasCardio ? 40 : 200;
	const maxDoseMg = Math.min(Math.round(weight * spec.mrd), spec.maxMg);
	const maxCarpByAnesth = Math.floor(maxDoseMg / spec.mgCarp);
	const maxCarpByEpi = spec.epiCarp > 0 && maxSafeEpi > 0 ? Math.floor(maxSafeEpi / spec.epiCarp) : 999;
	const absMax = Math.max(1, Math.min(maxCarpByAnesth, maxCarpByEpi));
	const recCarp = Math.min(planned, absMax);
	const totalEpi = Number((recCarp * spec.epiCarp).toFixed(1));

	if (planned > absMax) {
		warnings.push(`Превышение дозы: Запланировано ${planned} карп., что превышает безопасный лимит (${absMax} карп. для массы ${weight} кг). Доза ограничена ${recCarp} карп.`);
	}

	const summary = [
		`Анестетик: ${spec.name} (${spec.trade}).`,
		`Пациент: ${weight} кг. Предел активного вещества: ${maxDoseMg} мг (${absMax} карп. по 1.7 мл).`,
		`К введению: ${recCarp} карп. (${recCarp * spec.mgCarp} мг анестетика).`,
		spec.epiCarp > 0 ? `Нагрузка адреналина: ${totalEpi} мкг из допустимых ${maxSafeEpi} мкг.` : "Без адреналина (кардио-профиль).",
		warnings.length > 0 ? `ВНИМАНИЕ: ${warnings.join(" ")}` : "Соматических ограничений нет.",
	].join(" ");

	return {
		drugName: spec.name, tradeNameSample: spec.trade, concentrationPercent: spec.conc, vasoconstrictorRatio: spec.ratio,
		patientWeightKg: weight, maxDoseMg, mgPerCarpule: spec.mgCarp, maxCarpulesByAnesthetic: maxCarpByAnesth,
		maxCarpulesByEpinephrine: maxCarpByEpi, absoluteMaxCarpules: absMax, recommendedCarpules: recCarp, plannedCarpules: planned,
		epinephrineMcgPerCarpule: spec.epiCarp, totalEpinephrineMcg: totalEpi, maxSafeEpinephrineMcg: maxSafeEpi,
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
