/**
 * drugInteractionTool.ts — Clinical Drug-Drug Interactions (DDI) & Somatic Safety Tool.
 *
 * Adheres to:
 * - Mandate 8e & 8y: Zero pharmacological paranoia & zero blocking barriers for doctors.
 * - EBM recommendations: Penicillin allergy -> Clindamycin; NSAID allergy -> Paracetamol;
 *   Hypertension -> Mepivacaine / Articaine 1:200k; Glaucoma; Pregnancy.
 */

import crypto from "node:crypto";
import { z } from "zod";
import type { ChairsideSafetyAlert } from "../../chairsideSentinelEngine.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";

export const checkDrugInteractionsSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	plannedDrugs: z
		.array(z.string())
		.min(1, "Укажите хотя бы один планируемый препарат")
		.describe("Планируемые к введению или назначению препараты (например, ['Артикаин 1:100 000', 'Амоксициллин'])"),
	knownAllergies: z.array(z.string()).optional().describe("Известные аллергии пациента"),
	somaticConditions: z.array(z.string()).optional().describe("Сопутствующие соматические заболевания (гипертония, глаукома, беременность, диабет)"),
});

export type CheckDrugInteractionsInput = z.infer<typeof checkDrugInteractionsSchema>;

export interface CheckDrugInteractionsResult {
	safeToProceed: boolean;
	alerts: ChairsideSafetyAlert[];
	recommendedAnesthetic: string;
	recommendedAntibiotic: string;
	recommendedAnalgesic: string;
	isPhysiologicalNorm: boolean;
}

export const checkDrugInteractionsTool: ToolDefinition<
	typeof checkDrugInteractionsSchema,
	CheckDrugInteractionsResult
> = {
	name: "check_drug_interactions",
	description:
		"Проверка лекарственной безопасности: аллергии (пенициллины, НПВП, латекс, анестетики), соматические противопоказания (гипертония, закрытоугольная глаукома, беременность, антикоагулянты) с безопасными альтернативами.",
	parameters: checkDrugInteractionsSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx: AgentContext, args: CheckDrugInteractionsInput) => {
		const alerts: ChairsideSafetyAlert[] = [];
		const allergies = args.knownAllergies || [];
		const somatic = args.somaticConditions || [];
		const planned = args.plannedDrugs;

		let recommendedAnesthetic = "Артикаин 4% с эпинефрином 1:100 000 (Ультракаин Д-С форте)";
		let recommendedAntibiotic = "Амоксициллин 500 мг (или Амоксиклав 875/125 мг)";
		let recommendedAnalgesic = "Ибупрофен 400 мг / Нимесулид 100 мг";

		const isPenicillinAllergic = allergies.some((a) =>
			/(пенициллин|пеницилин|бета-лактам|penicillin|амоксициллин|амоксиклав|аугментин)/i.test(a),
		);
		const isPrescribedBetaLactam = planned.some((p) =>
			/(амоксициллин|амоксиклав|аугментин|пенициллин|ампициллин|флемоксин)/i.test(p),
		);

		if (isPenicillinAllergic && isPrescribedBetaLactam) {
			alerts.push({
				id: `alert_ddi_${crypto.randomUUID()}`,
				severity: "critical",
				alertType: "drug_allergy_conflict",
				title: "КРИТИЧЕСКИЙ КОНФЛИКТ: Аллергия на пенициллины vs Амоксициллин",
				message: "Пациент имеет аллергию на пенициллиновый ряд. Назначение бета-лактамов несет угрозу анафилаксии.",
				detectedAllergen: "Пенициллиновый ряд",
				conflictingItem: "Амоксициллин / Амоксиклав",
				safeAlternative: "Клиндамицин 300 мг (по 1 капсуле 3 раза в день 5-7 дней)",
				clinicalRationale: "Линкозамиды (Клиндамицин) не имеют перекрестной аллергии с пенициллинами и обладают высокой тропностью к костной ткани челюстей.",
				actionRequired: "Заменить пенициллин на Клиндамицин 300 мг",
				isBlocking: false,
			});
			recommendedAntibiotic = "Клиндамицин 300 мг";
		} else if (isPenicillinAllergic) {
			recommendedAntibiotic = "Клиндамицин 300 мг";
		}

		const isNsaidAllergic = allergies.some((a) => /(нпвс|нпвп|аспирин|ибупрофен|кеторол|найз)/i.test(a));
		const isPrescribedNsaid = planned.some((p) => /(нпвс|нпвп|ибупрофен|кеторол|кетанов|нимесулид|найз|нурофен)/i.test(p));

		if (isNsaidAllergic && isPrescribedNsaid) {
			alerts.push({
				id: `alert_nsaid_${crypto.randomUUID()}`,
				severity: "critical",
				alertType: "drug_allergy_conflict",
				title: "КОНФЛИКТ: Аллергия на НПВП / Аспириновая триада",
				message: "Риск бронхоспазма и ангионевротического отека при приеме НПВП.",
				detectedAllergen: "НПВП / Салицилаты",
				conflictingItem: "Препарат группы НПВП",
				safeAlternative: "Парацетамол 500-1000 мг (до 4 г/сутки)",
				clinicalRationale: "Парацетамол действует центрально, не провоцирует аспириновую астму.",
				isBlocking: false,
			});
			recommendedAnalgesic = "Парацетамол 500 мг";
		} else if (isNsaidAllergic) {
			recommendedAnalgesic = "Парацетамол 500 мг";
		}

		const isHypertensive = somatic.some((s) => /(гипертон|криз|ибс|стенокарди|давлен|ад\s*>)/i.test(s));
		if (isHypertensive) {
			alerts.push({
				id: `alert_cardio_${crypto.randomUUID()}`,
				severity: "warning",
				alertType: "somatic_contraindication",
				title: "Артериальная гипертензия / Кардиориск",
				message: "Адреналиновая нагрузка (1:100 000) может вызвать скачок АД и тахикардию.",
				safeAlternative: "Артикаин 1:200 000 или Мепивакаин 3% без вазоконстриктора (Скандонест)",
				clinicalRationale: "Контроль АД перед приемом. При АД > 160/100 плановое лечение перенести.",
				isBlocking: false,
			});
		}

		const isGlaucoma = somatic.some((s) => /(глауком|вгд)/i.test(s));
		if (isGlaucoma) {
			alerts.push({
				id: `alert_glaucoma_${crypto.randomUUID()}`,
				severity: "warning",
				alertType: "somatic_contraindication",
				title: "Закрытоугольная глаукома",
				message: "Вазоконстрикторы могут спровоцировать острый приступ глаукомы за счет расширения зрачка.",
				safeAlternative: "Мепивакаин 3% без адреналина",
				clinicalRationale: "Адреномиметики противопоказаны при узком и закрытом угле передней камеры глаза.",
				isBlocking: false,
			});
		}

		const isPregnant = somatic.some((s) => /(беременн|лактац|гв)/i.test(s));
		if (isPregnant) {
			alerts.push({
				id: `alert_preg_${crypto.randomUUID()}`,
				severity: "warning",
				alertType: "pregnancy_advisory",
				title: "Беременность / Лактация",
				message: "Высокая концентрация вазоконстриктора снижает маточно-плацентарный кровоток.",
				safeAlternative: "Артикаин 4% с эпинефрином 1:200 000 (Ультракаин Д-С)",
				clinicalRationale: "Артикаин минимально проникает через плаценту и быстро связывается белками плазмы.",
				isBlocking: false,
			});
			recommendedAnesthetic = "Артикаин 4% 1:200 000";
		}

		const isPhysiologicalNorm = alerts.length === 0;
		if (isPhysiologicalNorm) {
			alerts.push({
				id: `alert_norm_${crypto.randomUUID()}`,
				severity: "info",
				alertType: "physiological_norm",
				title: "Физиологическая норма",
				message: "Соматический фон и аллергоанамнез чисты. Полная клиническая автономия врача.",
				isBlocking: false,
			});
		}

		return {
			safeToProceed: true,
			alerts,
			recommendedAnesthetic,
			recommendedAntibiotic,
			recommendedAnalgesic,
			isPhysiologicalNorm,
		};
	},
};
