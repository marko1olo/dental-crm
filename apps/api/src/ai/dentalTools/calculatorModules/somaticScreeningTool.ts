/**
 * @file somaticScreeningTool.ts
 * @description Экспертный скрининг соматических рисков, антикоагулянтов, бисфосфонатов (MRONJ) и лекарственных аллергий.
 */
import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const checkSomaticRisksSchema = z.object({
	conditions: z.array(z.string()).default([]).describe("Соматические заболевания (гипертония, ИБС, диабет, астма)"),
	medications: z.array(z.string()).default([]).describe("Принимаемые препараты (варфарин, ксарелто, бисфосфонаты)"),
	allergies: z.array(z.string()).default([]).describe("Лекарственные аллергии (пенициллины, НПВС, йод)"),
	plannedIntervention: z.enum(["anesthesia", "tooth_extraction", "implant_surgery", "routine_therapy", "endodontics"]).default("routine_therapy").describe("Планируемое вмешательство"),
});

export type CheckSomaticRisksInput = z.infer<typeof checkSomaticRisksSchema>;

export interface CheckSomaticRisksResult {
	readonly highRiskFlags: readonly string[];
	readonly contraindications: readonly string[];
	readonly drugInteractions: readonly string[];
	readonly recommendations: readonly string[];
	readonly safeToProceed: boolean;
	readonly requiresConsultation: boolean;
}

export async function handleCheckSomaticRisks(args: CheckSomaticRisksInput, _context: DentalToolContext): Promise<CheckSomaticRisksResult> {
	const conds = (args.conditions ?? []).map((c) => c.toLowerCase());
	const meds = (args.medications ?? []).map((m) => m.toLowerCase());
	const allergies = (args.allergies ?? []).map((a) => a.toLowerCase());
	const interv = args.plannedIntervention ?? "routine_therapy";
	const isSurgery = interv === "tooth_extraction" || interv === "implant_surgery";

	const highRiskFlags: string[] = [];
	const contraindications: string[] = [];
	const drugInteractions: string[] = [];
	const recommendations: string[] = [];

	const hasAnticoag = meds.some((m) => /варфарин|ксарелт|ривароксабан|прадакс|дабигатран|эликвис|апиксабан/i.test(m)) || conds.some((c) => /тромбоз|мерцательн|протез клапан/i.test(c));
	const hasAntiplatelet = meds.some((m) => /аспирин|тромбо асс|кардиомагнил|клопидогрел|плавикс/i.test(m));
	if (hasAnticoag || hasAntiplatelet) {
		highRiskFlags.push("Высокий риск длительного луночкового кровотечения.");
		if (isSurgery) {
			recommendations.push("Хирургический протокол гемостаза: атравматичное удаление, резорбируемая гемостатическая губка, плотное ушивание лунки полигликолидными швами, аппликации транексамовой кислоты.");
			recommendations.push("Варфарин: контроль МНО за 24-48 ч до вмешательства (безопасный диапазон МНО 2.0–2.5). Самовольная отмена антикоагулянтов пациентом ЗАПРЕЩЕНА из-за риска тромбоэмболии.");
		}
	}

	const hasBisphosphonates = meds.some((m) => /бисфосфонат|золендрон|акласт|зомет|алендрон|фосамакс|ибандрон|бонвив|деносумаб|пролиа/i.test(m));
	if (hasBisphosphonates) {
		highRiskFlags.push("КРИТИЧЕСКИЙ РИСК: Медикаментозный остеонекроз челюсти (MRONJ).");
		if (isSurgery) {
			contraindications.push("Плановая дентальная имплантация и травматичные удаления зубов противопоказаны без консилиума с онкологом/эндокринологом.");
			recommendations.push("При неотложном удалении: максимальная атравматичность, сглаживание костных краев, первичное ушивание слизисто-надкостничным лоскутом без натяжения, периоперационная антибиотикопрофилактика.");
		}
	}

	const hasHypertension = conds.some((c) => /гипертон|гипертенз|криз|\bаг\b|\bгб\b/i.test(c));
	const hasBetaBlocker = meds.some((m) => /анаприлин|пропранолол|соталол/i.test(m));
	if (hasHypertension || hasBetaBlocker) {
		highRiskFlags.push("Риск адреналин-индуцированного гипертонического криза.");
		drugInteractions.push("Неселективные бета-блокаторы + адреналин: блокада бета-2 рецепторов приводит к беспрепятственной стимуляции альфа-1 сосудов, вызывая резкий спазм и тяжелый скачок АД.");
		recommendations.push("Анестезия: максимальная доза адреналина 0.04 мг (макс 2 карпулы 1:100 000 или 4 карпулы 1:200 000). Предпочтителен Мепивакаин 3% без вазоконстриктора.");
	}

	if (conds.some((c) => /диабет|инсулин|\bсд\b/i.test(c))) {
		recommendations.push("Сахарный диабет: риск замедленной эпителизации и вторичной инфекции. Назначать утренние визиты после приема пищи и плановой дозы инсулина/сахароснижающих.");
	}

	if (allergies.some((a) => /пенициллин|амоксиклав|аугментин|амоксициллин|флемоксин|ампициллин/i.test(a))) {
		contraindications.push("Абсолютно противопоказаны антибиотики пенициллинового ряда.");
		recommendations.push("Антибиотикопрофилактика альтернативными рядами: Клиндамицин (300 мг) либо Азитромицин / Кларитромицин.");
	}

	if (allergies.some((a) => /нпвс|аспирин|ибупрофен|кеторол|нимесил|диклофенак/i.test(a))) {
		contraindications.push("Противопоказаны классические НПВС (кеторол, ибупрофен, нимесулид).");
		recommendations.push("Купирование послеоперационной боли: Парацетамол (до 1000 мг до 4 раз в сутки).");
	}

	return {
		highRiskFlags, contraindications, drugInteractions, recommendations,
		safeToProceed: contraindications.length === 0,
		requiresConsultation: hasBisphosphonates || hasAnticoag,
	};
}

export const checkSomaticRisksTool: DentalToolEntry<typeof checkSomaticRisksSchema> = {
	name: "check_somatic_risks_and_contraindications",
	description: "Экспертный скрининг соматических заболеваний и лекарственных взаимодействий (антикоагулянты, бисфосфонаты/MRONJ, гипертония, аллергии на пенициллин и НПВС).",
	schema: checkSomaticRisksSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("check_somatic_risks_and_contraindications", "Скрининг соматических патологий, антикоагулянтов, бисфосфонатов и лекарственных аллергий перед приемом.", checkSomaticRisksSchema),
	handler: handleCheckSomaticRisks,
};

export const somaticScreeningTool = checkSomaticRisksTool;
